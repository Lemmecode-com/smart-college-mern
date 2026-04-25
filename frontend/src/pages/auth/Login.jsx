import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../auth/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

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
  FaArrowRight,
  FaShieldAlt,
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

    if (forgotMode) {
      setTimeout(() => {
        setSuccessMsg("Password reset link sent to your email.");
        setLoading(false);
      }, 800);
      return;
    }

    const result = await login({ email, password });

    if (!result.success) {
      const errorMsg = result.message || "Invalid credentials";

      // 🔒 FIRST LOGIN: Must change temporary password
      if (result.code === "MUST_CHANGE_PASSWORD") {
        // Store userId in sessionStorage for change-password page
        if (result.user?.id && typeof result.user.id === 'string' && result.user.id.trim() !== '' && result.user.id !== 'undefined') {
          sessionStorage.setItem("userId", result.user.id);
        }
        navigate("/change-password");
        setLoading(false);
        return;
      }

      if (errorMsg.includes("awaiting admin approval")) {
        setError("⏳ Your account is awaiting admin approval. Please check your email for approval confirmation.");
      } else if (errorMsg.includes("rejected")) {
        setError("❌ Your account has been rejected. Please contact the admin for more information.");
      } else if (errorMsg.includes("deactivated") || result.code === "ACCOUNT_DEACTIVATED") {
        setError("🚫 Your account has been deactivated. Please contact your administrator to request reactivation.");
      } else {
        setError(errorMsg);
      }
      setLoading(false);
      return;
    }

    setPassword("");
    setError("");
    setLoading(false);
    navigate("/home");
  };

  return (
    <div className="lp-root">

      {/* ── Layered Background ── */}
      <div className="lp-bg">
        <div className="lp-bg__mesh" />
        <div className="lp-bg__orb lp-bg__orb--1" />
        <div className="lp-bg__orb lp-bg__orb--2" />
        <div className="lp-bg__orb lp-bg__orb--3" />
        <div className="lp-bg__grid" />
        <div className="lp-bg__noise" />
      </div>

      {/* ── Floating Particles ── */}
      <div className="lp-particles">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className={`lp-particle lp-particle--${i % 4}`}
            style={{
              left: `${(i * 8.3 + 5)}%`,
              top: `${(i * 7.7 + 10) % 90}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${5 + (i % 3) * 1.5}s`,
            }}
          />
        ))}
      </div>

      {/* ── Main Card ── */}
      <motion.div
        className="lp-card"
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >

        {/* ══ LEFT PANEL ══ */}
        <div className="lp-left">
          <div className="lp-left__inner">
            <div className="lp-left__line" />

            {/* Logo */}
            <motion.div
              className="lp-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="lp-logo__ring">
                <div className="lp-logo__inner">
                  <span className="lp-logo__emoji">{forgotMode ? "🔐" : "🎓"}</span>
                </div>
              </div>
              <div className="lp-logo__glow" />
            </motion.div>

            {/* Text */}
            <motion.div
              className="lp-left__text"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <p className="lp-left__eyebrow">SMART COLLEGE PORTAL</p>
              <h1 className="lp-left__title">
                {forgotMode ? "Reset\nYour Access" : "Welcome\nBack"}
              </h1>
              <p className="lp-left__subtitle">
                {forgotMode
                  ? "We'll send you a secure link to restore your account access."
                  : "Sign in to access your personalized academic dashboard."}
              </p>
            </motion.div>

            {/* Feature pills */}
            {!forgotMode && (
              <motion.div
                className="lp-left__pills"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {["Dashboard", "Analytics", "Resources", "Support"].map((label) => (
                  <span key={label} className="lp-pill">{label}</span>
                ))}
              </motion.div>
            )}

            {/* Bottom deco */}
            <div className="lp-left__deco">
              <div className="lp-deco-bar" />
              <div className="lp-deco-bar lp-deco-bar--2" />
              <div className="lp-deco-bar lp-deco-bar--3" />
            </div>
          </div>
          <div className="lp-left__corner-glow" />
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div className="lp-right">

          {/* Header */}
          <motion.div
            className="lp-form-head"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div className={`lp-form-icon ${forgotMode ? "lp-form-icon--alt" : ""}`}>
              {forgotMode ? <FaLock size={18} /> : <FaUser size={18} />}
            </div>
            <h2 className="lp-form-title">
              {forgotMode ? "Forgot Password" : "Sign In"}
            </h2>
            <p className="lp-form-sub">
              {forgotMode
                ? "Enter your email to receive reset instructions"
                : "Enter your credentials to continue"}
            </p>
          </motion.div>

          {/* ══ DIVIDER ══ */}
          <div className="lp-divider">
            <div className="lp-divider__track">
              <div className="lp-divider__fill" />
            </div>
            <div className="lp-divider__badge">
              <span className="lp-divider__icon"><FaShieldAlt size={9} /></span>
              <span className="lp-divider__text">SECURE LOGIN</span>
            </div>
            <div className="lp-divider__track">
              <div className="lp-divider__fill lp-divider__fill--rev" />
            </div>
          </div>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="err"
                className="lp-alert lp-alert--error"
                initial={{ opacity: 0, y: -10, maxHeight: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                animate={{ opacity: 1, y: 0, maxHeight: 120, marginBottom: "1rem", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                exit={{ opacity: 0, y: -10, maxHeight: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <FaExclamationCircle className="lp-alert__icon" />
                <span>{error}</span>
                <button className="lp-alert__close" onClick={() => setError("")}><FaTimes /></button>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                key="ok"
                className="lp-alert lp-alert--success"
                initial={{ opacity: 0, y: -10, maxHeight: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                animate={{ opacity: 1, y: 0, maxHeight: 120, marginBottom: "1rem", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                exit={{ opacity: 0, y: -10, maxHeight: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <FaCheckCircle className="lp-alert__icon" />
                <span>{successMsg}</span>
                <button className="lp-alert__close" onClick={() => setSuccessMsg("")}><FaTimes /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={submitHandler} className="lp-form">

            {/* Email */}
            <motion.div
              className={`lp-field ${focusedField === "email" ? "lp-field--focus" : ""} ${error ? "lp-field--error" : ""}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <label className="lp-label">
                <FaEnvelope className="lp-label__icon" />
                Email Address
              </label>
              <div className="lp-input-wrap">
                <input
                  type="email"
                  className="lp-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField("")}
                  autoComplete="email"
                />
                <div className="lp-input-bar" />
              </div>
            </motion.div>

            {/* Password */}
            <AnimatePresence>
              {!forgotMode && (
                <motion.div
                  className={`lp-field ${focusedField === "password" ? "lp-field--focus" : ""} ${error ? "lp-field--error" : ""}`}
                  initial={{ opacity: 0, x: -16, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: -16, height: 0 }}
                  transition={{ delay: 0.45, duration: 0.4 }}
                >
                  <label className="lp-label">
                    <FaLock className="lp-label__icon" />
                    Password
                  </label>
                  <div className="lp-input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="lp-input lp-input--password"
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField("")}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="lp-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    <div className="lp-input-bar" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button
                type="submit"
                className={`lp-submit ${loading ? "lp-submit--loading" : ""}`}
                disabled={loading}
              >
                <span className="lp-submit__bg" />
                <span className="lp-submit__shine" />
                <span className="lp-submit__content">
                  {loading ? (
                    <>
                      <span className="lp-spinner" />
                      <span>Processing…</span>
                    </>
                  ) : (
                    <>
                      <span>{forgotMode ? "Send Reset Link" : "Sign In"}</span>
                      <FaArrowRight className="lp-submit__arrow" />
                    </>
                  )}
                </span>
              </button>
            </motion.div>

            {/* Forgot / Back */}
            <motion.div
              className="lp-form-link-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {!forgotMode ? (
                <Link to="/forgot-password" className="lp-text-btn">
                  <FaLock style={{ fontSize: "0.7rem" }} />
                  Forgot Password?
                </Link>
              ) : (
                <button
                  type="button"
                  className="lp-text-btn"
                  onClick={() => { setForgotMode(false); setError(""); setSuccessMsg(""); }}
                >
                  <FaArrowLeft style={{ fontSize: "0.7rem" }} />
                  Back to Login
                </button>
              )}
            </motion.div>

          </form>

          {/* Footer */}
          <motion.div
            className="lp-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <span className="lp-security-badge">
              <span className="lp-security-dot" />
              Secured by NOVAA
            </span>
            <a href="/" className="lp-home-link">
              <FaHome />
              Back to Home
            </a>
          </motion.div>

        </div>
      </motion.div>

      {/* ══════════════ STYLES ══════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; overflow: hidden; }

        /* ── Variables ── */
        :root {
          --ocean-900:  #060e17;
          --ocean-600:  #0f3a4a;
          --ocean-500:  #0c2d3a;
          --cyan-500:   #1a8ab5;
          --cyan-400:   #3db5e6;
          --cyan-300:   #4fc3f7;
          --cyan-200:   #80d8ff;
          --cyan-glow:  rgba(61,181,230,0.35);
          --white:      #ffffff;
          --success:    #10b981;
          --error:      #ef4444;
          --font:       'Sora', sans-serif;
          --mono:       'JetBrains Mono', monospace;
          --rp-bg:              #ffffff;
          --rp-text:            #1a2e3b;
          --rp-sub:             #5c7a8a;
          --rp-label:           #4a6577;
          --rp-input-bg:        #f4f8fb;
          --rp-input-border:    #d4e6f0;
          --rp-input-focus-bg:  #eaf5fb;
          --rp-footer-border:   #e4eef4;
          --rp-muted:           #8da8b8;
        }

        /* ── Root — always fills viewport, never scrolls ── */
        .lp-root {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          font-family: var(--font);
          overflow: hidden;
        }

        /* ─── BACKGROUND ─── */
        .lp-bg { position: absolute; inset: 0; z-index: 0; background: var(--ocean-900); }
        .lp-bg__mesh {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 20%, rgba(15,58,74,.9) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 80%, rgba(12,45,58,.8) 0%, transparent 55%),
            radial-gradient(ellipse 50% 50% at 50% 50%, rgba(10,30,46,.7) 0%, transparent 70%);
        }
        .lp-bg__orb { position: absolute; border-radius: 50%; filter: blur(80px); animation: orbFloat 20s ease-in-out infinite; }
        .lp-bg__orb--1 { width: 600px; height: 600px; top: -200px; left: -150px; background: radial-gradient(circle, rgba(61,181,230,.12) 0%, transparent 65%); }
        .lp-bg__orb--2 { width: 500px; height: 500px; bottom: -150px; right: -100px; background: radial-gradient(circle, rgba(79,195,247,.1) 0%, transparent 65%); animation-delay: 7s; }
        .lp-bg__orb--3 { width: 350px; height: 350px; top: 50%; left: 50%; transform: translate(-50%,-50%); background: radial-gradient(circle, rgba(61,181,230,.06) 0%, transparent 60%); animation-delay: 14s; }
        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(30px,-20px) scale(1.05); }
          66%      { transform: translate(-20px,25px) scale(.97); }
        }
        .lp-bg__grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(61,181,230,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(61,181,230,.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%);
        }
        .lp-bg__noise {
          position: absolute; inset: 0; opacity: .03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }

        /* ── Particles ── */
        .lp-particles { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
        .lp-particle  { position: absolute; border-radius: 50%; animation: particleDrift 5s ease-in-out infinite; opacity: 0; }
        .lp-particle--0 { width: 3px; height: 3px; background: var(--cyan-400); }
        .lp-particle--1 { width: 2px; height: 2px; background: var(--cyan-300); }
        .lp-particle--2 { width: 4px; height: 4px; background: rgba(128,216,255,.7); }
        .lp-particle--3 { width: 2px; height: 2px; background: var(--cyan-200); }
        @keyframes particleDrift {
          0%,100% { opacity: 0; transform: translateY(0) scale(.5); }
          30%,70%  { opacity: .9; }
          50%      { transform: translateY(-40px) scale(1); opacity: .6; }
        }

        /* ─── CARD ─── */
        .lp-card {
          position: relative; z-index: 2;
          display: flex;
          width: 100%;
          max-width: 820px;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(61,181,230,.18);
          box-shadow:
            0 0 0 1px rgba(0,0,0,.4),
            0 32px 64px rgba(0,0,0,.55),
            0 0 100px rgba(61,181,230,.05),
            inset 0 1px 0 rgba(255,255,255,.05);
        }

        /* ─── LEFT PANEL ─── */
        .lp-left {
          position: relative;
          flex: 0 0 38%;
          background: linear-gradient(155deg, #0f3a4a 0%, #0a2233 55%, #060e17 100%);
          display: flex; flex-direction: column;
          padding: 2.25rem 2rem;
          overflow: hidden;
        }
        .lp-left::after {
          content: '';
          position: absolute; top: 0; right: 0;
          width: 1px; height: 100%;
          background: linear-gradient(to bottom, transparent 0%, rgba(61,181,230,.3) 30%, rgba(61,181,230,.5) 60%, transparent 100%);
        }
        .lp-left__inner { position: relative; z-index: 2; display: flex; flex-direction: column; height: 100%; }
        .lp-left__line {
          width: 40px; height: 2.5px;
          background: linear-gradient(90deg, var(--cyan-400), var(--cyan-200));
          border-radius: 2px; margin-bottom: 1.75rem;
          box-shadow: 0 0 10px var(--cyan-glow);
        }

        /* Logo */
        .lp-logo { position: relative; width: 72px; height: 72px; margin-bottom: 1.5rem; }
        .lp-logo__ring {
          width: 72px; height: 72px; border-radius: 20px;
          border: 1.5px solid rgba(61,181,230,.4);
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(61,181,230,.12) 0%, rgba(12,45,58,.6) 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 6px 24px rgba(0,0,0,.4);
        }
        .lp-logo__inner {
          width: 52px; height: 52px; border-radius: 14px;
          background: linear-gradient(135deg, #1a5068 0%, #0d3346 100%);
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(61,181,230,.25);
        }
        .lp-logo__emoji { font-size: 1.6rem; filter: drop-shadow(0 2px 6px rgba(0,0,0,.5)); }
        .lp-logo__glow {
          position: absolute; inset: -10px; border-radius: 28px;
          background: radial-gradient(circle, rgba(61,181,230,.2) 0%, transparent 65%);
          z-index: -1; animation: logoGlow 3s ease-in-out infinite;
        }
        @keyframes logoGlow {
          0%,100% { opacity: .5; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.08); }
        }

        .lp-left__eyebrow { font-family: var(--mono); font-size: .6rem; letter-spacing: .18em; color: var(--cyan-400); margin-bottom: .6rem; opacity: .85; }
        .lp-left__title { font-size: 2rem; font-weight: 800; line-height: 1.1; letter-spacing: -.8px; color: #fff; white-space: pre-line; margin-bottom: 1rem; text-shadow: 0 2px 20px rgba(0,0,0,.4); }
        .lp-left__subtitle { font-size: .83rem; font-weight: 300; line-height: 1.65; color: rgba(200,225,235,.75); }

        .lp-left__pills { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: 1.5rem; }
        .lp-pill {
          font-family: var(--mono); font-size: .65rem; letter-spacing: .06em;
          padding: .28rem .7rem; border-radius: 100px;
          border: 1px solid rgba(61,181,230,.25);
          color: rgba(128,216,255,.8); background: rgba(61,181,230,.07);
          transition: all .2s ease;
        }
        .lp-pill:hover { background: rgba(61,181,230,.15); border-color: rgba(61,181,230,.5); color: var(--cyan-200); }

        .lp-left__deco { margin-top: auto; display: flex; gap: 5px; align-items: flex-end; }
        .lp-deco-bar { width: 3px; height: 20px; border-radius: 2px; background: linear-gradient(to top, var(--cyan-400), transparent); opacity: .5; }
        .lp-deco-bar--2 { height: 30px; opacity: .7; }
        .lp-deco-bar--3 { height: 15px; opacity: .4; }
        .lp-left__corner-glow {
          position: absolute; bottom: -80px; right: -80px;
          width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(61,181,230,.12) 0%, transparent 65%);
          filter: blur(20px); z-index: 1; pointer-events: none;
        }

        /* ─── RIGHT PANEL ─── */
        .lp-right {
          flex: 1;
          background: var(--rp-bg);
          padding: 2rem 2.25rem 1.75rem;
          display: flex; flex-direction: column;
          position: relative; overflow: hidden;
          min-width: 0;
        }
        .lp-right::before {
          content: ''; position: absolute; top: -80px; right: -80px;
          width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(61,181,230,.07) 0%, transparent 65%);
          filter: blur(30px); pointer-events: none;
        }
        .lp-right::after {
          content: ''; position: absolute; bottom: -50px; left: -50px;
          width: 160px; height: 160px; border-radius: 50%;
          background: radial-gradient(circle, rgba(61,181,230,.04) 0%, transparent 65%);
          filter: blur(20px); pointer-events: none;
        }

        /* Form header */
        .lp-form-head { margin-bottom: 1rem; }
        .lp-form-icon {
          width: 42px; height: 42px; border-radius: 13px;
          background: linear-gradient(135deg, rgba(61,181,230,.15) 0%, rgba(61,181,230,.06) 100%);
          border: 1px solid rgba(61,181,230,.25);
          display: flex; align-items: center; justify-content: center;
          color: var(--cyan-400); margin-bottom: .85rem;
          box-shadow: 0 3px 12px rgba(61,181,230,.12);
        }
        .lp-form-icon--alt { background: linear-gradient(135deg, rgba(61,181,230,.2) 0%, rgba(79,195,247,.08) 100%); }
        .lp-form-title { font-size: 1.45rem; font-weight: 700; letter-spacing: -.4px; color: var(--rp-text); margin-bottom: .25rem; }
        .lp-form-sub { font-size: .8rem; color: var(--rp-sub); font-weight: 300; }

        /* Divider */
        .lp-divider { display: flex; align-items: center; gap: 8px; margin: .85rem 0 1.1rem; }
        .lp-divider__track { flex: 1; height: 1.5px; background: rgba(61,181,230,.18); border-radius: 2px; overflow: hidden; position: relative; }
        .lp-divider__fill {
          position: absolute; top: 0; left: 0; height: 100%; width: 55%;
          background: linear-gradient(90deg, transparent 0%, var(--cyan-400) 50%, transparent 100%);
          animation: dividerShimmer 3.5s ease-in-out infinite;
        }
        .lp-divider__fill--rev { animation: dividerShimmerRev 3.5s ease-in-out infinite; }
        @keyframes dividerShimmer {
          0%   { transform: translateX(-110%); opacity: 0; }
          20%  { opacity: 1; } 80% { opacity: 1; }
          100% { transform: translateX(210%); opacity: 0; }
        }
        @keyframes dividerShimmerRev {
          0%   { transform: translateX(210%); opacity: 0; }
          20%  { opacity: 1; } 80% { opacity: 1; }
          100% { transform: translateX(-110%); opacity: 0; }
        }
        .lp-divider__badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 9px; border-radius: 100px;
          background: linear-gradient(135deg, rgba(61,181,230,.1) 0%, rgba(61,181,230,.04) 100%);
          border: 1px solid rgba(61,181,230,.25);
          box-shadow: 0 2px 8px rgba(61,181,230,.1), inset 0 1px 0 rgba(255,255,255,.7);
          white-space: nowrap; flex-shrink: 0;
        }
        .lp-divider__icon { display: flex; align-items: center; color: var(--cyan-400); opacity: .9; }
        .lp-divider__text { font-family: var(--mono); font-size: .58rem; font-weight: 600; letter-spacing: .14em; color: var(--cyan-500); }

        /* Alerts */
        .lp-alert {
          display: flex; align-items: flex-start; gap: .65rem;
          padding: .75rem .9rem; border-radius: 10px;
          font-size: .8rem; font-weight: 500;
        }
        .lp-alert--error  { background: rgba(239,68,68,.07); border: 1px solid rgba(239,68,68,.2); color: #dc2626; }
        .lp-alert--success{ background: rgba(16,185,129,.07); border: 1px solid rgba(16,185,129,.2); color: #059669; }
        .lp-alert__icon { flex-shrink: 0; font-size: .95rem; margin-top: 1px; }
        .lp-alert__close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: .5; transition: opacity .2s; display: flex; align-items: center; padding: 2px; flex-shrink: 0; }
        .lp-alert__close:hover { opacity: 1; }

        /* Form fields */
        .lp-form { flex: 1; display: flex; flex-direction: column; }
        .lp-field { margin-bottom: 1.1rem; }
        .lp-label {
          display: flex; align-items: center; gap: .4rem;
          font-size: .68rem; font-weight: 600; letter-spacing: .08em;
          color: var(--rp-label); margin-bottom: .45rem;
          text-transform: uppercase; transition: color .2s ease;
        }
        .lp-field--focus .lp-label { color: var(--cyan-400); }
        .lp-field--error .lp-label { color: var(--error); }
        .lp-label__icon { font-size: .62rem; }

        .lp-input-wrap { position: relative; }
        .lp-input {
          width: 100%; padding: .72rem 1rem;
          background: var(--rp-input-bg);
          border: 1.5px solid var(--rp-input-border);
          border-radius: 10px;
          font-family: var(--font); font-size: .88rem;
          color: var(--rp-text); outline: none; transition: all .2s ease;
        }
        .lp-input::placeholder { color: #b0c8d4; }
        .lp-input--password { padding-right: 2.75rem; }
        .lp-input:hover { background: #edf4f8; border-color: rgba(61,181,230,.4); }
        .lp-field--focus .lp-input { background: var(--rp-input-focus-bg); border-color: var(--cyan-400); box-shadow: 0 0 0 3px rgba(61,181,230,.12); }
        .lp-field--error .lp-input { border-color: rgba(239,68,68,.4); background: rgba(239,68,68,.03); }

        .lp-input-bar {
          position: absolute; bottom: 0; left: 10px;
          height: 2px; width: 0; border-radius: 1px;
          background: linear-gradient(90deg, var(--cyan-400), var(--cyan-200));
          transition: width .3s ease; box-shadow: 0 0 6px rgba(61,181,230,.5);
        }
        .lp-field--focus .lp-input-bar { width: calc(100% - 20px); }

        .lp-eye-btn {
          position: absolute; right: .75rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #9ab8c8; cursor: pointer;
          padding: 3px 5px; border-radius: 6px; transition: all .2s ease;
          display: flex; align-items: center; font-size: .85rem;
        }
        .lp-eye-btn:hover { color: var(--cyan-400); background: rgba(61,181,230,.08); }

        /* Submit */
        .lp-submit {
          position: relative; display: flex; align-items: center;
          width: 100%; border: none; border-radius: 12px; padding: 0;
          cursor: pointer; overflow: hidden;
          transition: transform .2s ease, box-shadow .2s ease;
          box-shadow: 0 4px 18px rgba(61,181,230,.28); margin-top: .2rem;
        }
        .lp-submit__bg { position: absolute; inset: 0; background: linear-gradient(135deg, #3db5e6 0%, #1a8ab5 50%, #0d6a8e 100%); }
        .lp-submit__shine { position: absolute; inset: 0; background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%); opacity: 0; transition: opacity .2s ease; }
        .lp-submit:hover:not(:disabled) .lp-submit__shine { opacity: 1; }
        .lp-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(61,181,230,.42); }
        .lp-submit:active:not(:disabled) { transform: translateY(0); }
        .lp-submit:disabled { opacity: .5; cursor: not-allowed; }
        .lp-submit__content {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: center;
          gap: .55rem; width: 100%; padding: .82rem 1.75rem;
          font-family: var(--font); font-size: .9rem; font-weight: 700;
          letter-spacing: .04em; color: #fff;
        }
        .lp-submit__arrow { font-size: .75rem; transition: transform .2s ease; }
        .lp-submit:hover .lp-submit__arrow { transform: translateX(4px); }
        .lp-spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,.3); border-top-color: white; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .lp-form-link-row { display: flex; align-items: center; margin-top: .6rem; }
        .lp-text-btn {
          display: inline-flex; align-items: center; gap: .35rem;
          background: none; border: none; color: var(--rp-sub);
          font-family: var(--font); font-size: .78rem; font-weight: 500;
          cursor: pointer; text-decoration: none;
          padding: .4rem .55rem; border-radius: 7px; transition: all .2s ease;
        }
        .lp-text-btn:hover { color: var(--cyan-400); background: rgba(61,181,230,.07); }

        /* Footer */
        .lp-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 1.1rem; padding-top: .9rem;
          border-top: 1px solid var(--rp-footer-border);
          flex-wrap: wrap; gap: .4rem;
        }
        .lp-security-badge { display: inline-flex; align-items: center; gap: .4rem; font-family: var(--mono); font-size: .63rem; letter-spacing: .07em; color: var(--rp-muted); }
        .lp-security-dot {
          width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
          background: var(--success); box-shadow: 0 0 5px rgba(16,185,129,.5);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .6; transform: scale(.85); }
        }
        .lp-home-link {
          display: inline-flex; align-items: center; gap: .35rem;
          font-size: .75rem; font-weight: 600; color: var(--cyan-400);
          text-decoration: none; padding: .35rem .65rem;
          border-radius: 7px; transition: all .2s ease; border: 1px solid transparent;
        }
        .lp-home-link:hover { background: rgba(61,181,230,.07); border-color: rgba(61,181,230,.2); color: var(--cyan-500); }

        /* ═══════════════════════════════════════════
           RESPONSIVE
        ═══════════════════════════════════════════ */

        /* ── Large desktop ≥ 1400px ── */
        @media (min-width: 1400px) {
          .lp-card { max-width: 900px; }
          .lp-left { padding: 2.75rem 2.5rem; }
          .lp-right { padding: 2.25rem 2.75rem 2rem; }
          .lp-left__title { font-size: 2.4rem; }
        }

        /* ── Standard desktop 1024–1399px ── */
        @media (max-width: 1399px) and (min-width: 1024px) {
          .lp-card { max-width: 820px; }
        }

        /* ── Small desktop / laptop 768–1023px ── */
        @media (max-width: 1023px) and (min-width: 768px) {
          .lp-card { max-width: 700px; }
          .lp-left { flex: 0 0 36%; padding: 1.75rem 1.5rem; }
          .lp-right { padding: 1.75rem 1.75rem 1.5rem; }
          .lp-left__title { font-size: 1.75rem; }
          .lp-logo { width: 60px; height: 60px; margin-bottom: 1.25rem; }
          .lp-logo__ring { width: 60px; height: 60px; border-radius: 16px; }
          .lp-logo__inner { width: 44px; height: 44px; border-radius: 12px; }
          .lp-logo__emoji { font-size: 1.4rem; }
          .lp-left__pills { margin-top: 1.1rem; }
          .lp-left__subtitle { font-size: .78rem; }
        }

        /* ── Tablet landscape 600–767px — horizontal header strip ── */
        @media (max-width: 767px) and (min-width: 600px) {
          .lp-root { padding: 1rem; }
          .lp-card { flex-direction: column; border-radius: 20px; max-width: 520px; }
          .lp-left {
            flex: unset; flex-direction: row; align-items: center;
            padding: 1rem 1.5rem; gap: 1rem;
          }
          .lp-left__inner { flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 1rem; height: auto; width: 100%; }
          .lp-left__line { display: none; }
          .lp-left__deco { display: none; }
          .lp-left__pills { display: none; }
          .lp-left__subtitle { display: none; }
          .lp-left::after { display: none; }
          .lp-logo { width: 46px; height: 46px; margin: 0; flex-shrink: 0; }
          .lp-logo__ring { width: 46px; height: 46px; border-radius: 12px; }
          .lp-logo__inner { width: 34px; height: 34px; border-radius: 9px; }
          .lp-logo__emoji { font-size: 1.1rem; }
          .lp-logo__glow { display: none; }
          .lp-left__text { flex: 1; min-width: 0; }
          .lp-left__eyebrow { font-size: .55rem; margin-bottom: .1rem; }
          .lp-left__title { font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -.1px; margin-bottom: 0; }
          .lp-right { padding: 1.75rem 1.5rem 1.5rem; }
        }

        /* ── Phone portrait ≤ 599px — centred card, no left panel ── */
        @media (max-width: 599px) {
          .lp-root {
            padding: 1rem;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .lp-card {
            flex-direction: column;
            border-radius: 20px;
            width: 100%;
            max-width: 400px;
            margin: auto;
          }
          .lp-left { display: none; }
          .lp-right {
            padding: 1.75rem 1.4rem 1.5rem;
            border-radius: 20px;
          }
          .lp-right::before, .lp-right::after { display: none; }
          .lp-form-link-row { justify-content: center; }
          .lp-footer { justify-content: center; text-align: center; }
        }

        /* ── Very small phones ≤ 374px ── */
        @media (max-width: 374px) {
          .lp-root { padding: .6rem; }
          .lp-right { padding: 1.5rem 1.1rem 1.25rem; }
          .lp-form-title { font-size: 1.2rem; }
          .lp-input { padding: .65rem .875rem; font-size: .83rem; }
          .lp-submit__content { padding: .75rem 1.25rem; font-size: .84rem; }
          .lp-divider { margin: .6rem 0 .85rem; }
          .lp-field { margin-bottom: .9rem; }
        }

        /* ── Landscape phones height ≤ 500px ── */
        @media (max-height: 500px) and (orientation: landscape) {
          .lp-root { overflow: hidden; padding: .4rem; }
          .lp-card { border-radius: 14px; }
          .lp-left { display: none; }
          .lp-right { padding: 1rem 1.25rem .875rem; border-radius: 14px; }
          .lp-form-head { margin-bottom: .6rem; }
          .lp-form-icon { width: 34px; height: 34px; margin-bottom: .5rem; }
          .lp-form-title { font-size: 1.1rem; }
          .lp-form-sub { font-size: .75rem; }
          .lp-divider { margin: .5rem 0 .75rem; }
          .lp-field { margin-bottom: .75rem; }
          .lp-input { padding: .55rem .875rem; font-size: .83rem; }
          .lp-submit__content { padding: .7rem 1.5rem; font-size: .85rem; }
          .lp-footer { margin-top: .7rem; padding-top: .65rem; }
        }

        /* ── Landscape tablets height 501–700px ── */
        @media (max-height: 700px) and (min-height: 501px) {
          .lp-right { padding: 1.5rem 2rem 1.25rem; }
          .lp-field { margin-bottom: .9rem; }
          .lp-divider { margin: .7rem 0 .9rem; }
          .lp-footer { margin-top: .85rem; }
        }
      `}</style>
    </div>
  );
}