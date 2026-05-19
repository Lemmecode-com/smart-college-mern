import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";

import {
  FaLock,
  FaKey,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaRedo,
  FaTimes,
  FaShieldAlt,
  FaEye,
  FaEyeSlash,
  FaHome,
  FaArrowRight,
} from "react-icons/fa";

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

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
  const [timer, setTimer] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((p) => p - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleResendOTP = async () => {
    if (!canResend) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email: formData.email });
      toast.success("✅ OTP resent successfully!", { position: "top-right", autoClose: 3000 });
      setTimer(600);
      setCanResend(false);
    } catch (err) {
      toast.error("❌ " + (err.response?.data?.message || "Failed to resend OTP"), { position: "top-right", autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-otp-reset", {
        email: formData.email,
        otp: formData.otp,
        newPassword: formData.newPassword,
      });
      toast.success("✅ Password reset successfully!", { position: "top-right", autoClose: 3000 });
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to verify OTP";
      setError(msg);
      toast.error("❌ " + msg, { position: "top-right", autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const timerUrgent = timer > 0 && timer < 60;

  return (
    <div className="vo-root">
      <ToastContainer position="top-right" />

      {/* Background */}
      <div className="vo-bg">
        <div className="vo-bg__mesh" />
        <div className="vo-bg__orb vo-bg__orb--1" />
        <div className="vo-bg__orb vo-bg__orb--2" />
        <div className="vo-bg__grid" />
      </div>

      {/* Particles */}
      <div className="vo-particles">
        {[...Array(10)].map((_, i) => (
          <span
            key={i}
            className={`vo-particle vo-particle--${i % 4}`}
            style={{
              left: `${(i * 10 + 5)}%`,
              top: `${(i * 9 + 8) % 88}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${5 + (i % 3) * 1.5}s`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <motion.div
        className="vo-card"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* LEFT */}
        <div className="vo-left">
          <div className="vo-left__inner">
            <div className="vo-left__line" />

            <motion.div
              className="vo-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="vo-logo__ring">
                <div className="vo-logo__inner">
                  <span className="vo-logo__emoji">🔑</span>
                </div>
              </div>
              <div className="vo-logo__glow" />
            </motion.div>

            <motion.div
              className="vo-left__text"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <p className="vo-left__eyebrow">SMART COLLEGE PORTAL</p>
              <h1 className="vo-left__title">{"Verify &\nReset"}</h1>
              <p className="vo-left__subtitle">
                Enter the OTP sent to your email and create a new secure password.
              </p>
            </motion.div>

            {/* Email chip */}
            <motion.div
              className="vo-email-chip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <span className="vo-email-chip__dot" />
              <span className="vo-email-chip__text">{email}</span>
            </motion.div>

            {/* Timer display on left */}
            <motion.div
              className={`vo-timer-display ${timerUrgent ? "vo-timer-display--urgent" : ""}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
            >
              <span className="vo-timer-display__label">OTP expires in</span>
              <span className="vo-timer-display__value">
                {timer > 0 ? formatTime(timer) : "Expired"}
              </span>
            </motion.div>

            <div className="vo-left__deco">
              <div className="vo-deco-bar" />
              <div className="vo-deco-bar vo-deco-bar--2" />
              <div className="vo-deco-bar vo-deco-bar--3" />
            </div>
          </div>
          <div className="vo-left__corner-glow" />
        </div>

        {/* RIGHT */}
        <div className="vo-right">
          <motion.div
            className="vo-form-head"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div className="vo-form-icon">
              <FaKey size={17} />
            </div>
            <h2 className="vo-form-title">Verify OTP</h2>
            <p className="vo-form-sub">
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
          </motion.div>

          <div className="vo-divider">
            <div className="vo-divider__track"><div className="vo-divider__fill" /></div>
            <div className="vo-divider__badge">
              <span className="vo-divider__icon"><FaShieldAlt size={9} /></span>
              <span className="vo-divider__text">SECURE RESET</span>
            </div>
            <div className="vo-divider__track"><div className="vo-divider__fill vo-divider__fill--rev" /></div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="err"
                className="vo-alert vo-alert--error"
                initial={{ opacity: 0, y: -10, maxHeight: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                animate={{ opacity: 1, y: 0, maxHeight: 120, marginBottom: "1rem", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                exit={{ opacity: 0, y: -10, maxHeight: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <FaExclamationCircle className="vo-alert__icon" />
                <span>{error}</span>
                <button className="vo-alert__close" onClick={() => setError("")}><FaTimes /></button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="vo-form">

            {/* OTP Field */}
            <motion.div
              className={`vo-field ${focusedField === "otp" ? "vo-field--focus" : ""} ${error ? "vo-field--error" : ""}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <label className="vo-label">
                <FaLock className="vo-label__icon" />
                One-Time Password (OTP)
              </label>
              <div className="vo-input-wrap">
                <input
                  type="text"
                  className="vo-input vo-input--otp"
                  placeholder="• • • • • •"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("otp")}
                  onBlur={() => setFocusedField("")}
                  maxLength="6"
                  pattern="\d{6}"
                  required
                  autoComplete="one-time-code"
                />
                <div className="vo-input-bar" />
              </div>
            </motion.div>

            {/* New Password */}
            <motion.div
              className={`vo-field ${focusedField === "newPassword" ? "vo-field--focus" : ""}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.42, duration: 0.4 }}
            >
              <label className="vo-label">
                <FaLock className="vo-label__icon" />
                New Password
              </label>
              <div className="vo-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className="vo-input vo-input--password"
                  placeholder="Min. 6 characters"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("newPassword")}
                  onBlur={() => setFocusedField("")}
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  className="vo-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                <div className="vo-input-bar" />
              </div>
            </motion.div>

            {/* Confirm Password */}
            <motion.div
              className={`vo-field ${focusedField === "confirmPassword" ? "vo-field--focus" : ""}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.49, duration: 0.4 }}
            >
              <label className="vo-label">
                <FaLock className="vo-label__icon" />
                Confirm Password
              </label>
              <div className="vo-input-wrap">
                <input
                  type={showConfirm ? "text" : "password"}
                  className="vo-input vo-input--password"
                  placeholder="Re-enter new password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField("")}
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  className="vo-eye-btn"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
                <div className="vo-input-bar" />
              </div>
            </motion.div>

            {/* Submit */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
              <button
                type="submit"
                className={`vo-submit ${loading ? "vo-submit--loading" : ""}`}
                disabled={loading}
              >
                <span className="vo-submit__bg" />
                <span className="vo-submit__shine" />
                <span className="vo-submit__content">
                  {loading ? (
                    <>
                      <span className="vo-spinner" />
                      <span>Verifying…</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle style={{ fontSize: "0.8rem" }} />
                      <span>Verify & Reset Password</span>
                      <FaArrowRight className="vo-submit__arrow" />
                    </>
                  )}
                </span>
              </button>
            </motion.div>

            {/* Resend row */}
            <motion.div
              className="vo-resend-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.62 }}
            >
              <span className={`vo-timer-badge ${timerUrgent ? "vo-timer-badge--urgent" : ""}`}>
                {timer > 0 ? <>⏱ {formatTime(timer)}</> : <>⚠ OTP expired</>}
              </span>
              <button
                type="button"
                className={`vo-resend-btn ${canResend ? "vo-resend-btn--active" : ""}`}
                onClick={handleResendOTP}
                disabled={!canResend || loading}
              >
                <FaRedo style={{ fontSize: "0.7rem" }} />
                Resend OTP
              </button>
            </motion.div>

            {/* Back link */}
            <motion.div
              className="vo-form-link-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.67 }}
            >
              <Link to="/login" className="vo-text-btn">
                <FaArrowLeft style={{ fontSize: "0.7rem" }} />
                Back to Login
              </Link>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.div
            className="vo-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.72 }}
          >
            <span className="vo-security-badge">
              <span className="vo-security-dot" />
              Secured by NOVAA
            </span>
            <a href="/" className="vo-home-link">
              <FaHome />
              Back to Home
            </a>
          </motion.div>
        </div>
      </motion.div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; overflow: hidden; }

        :root {
          --ocean-900:  #060e17;
          --ocean-600:  #0f3a4a;
          --cyan-500:   #1a8ab5;
          --cyan-400:   #3db5e6;
          --cyan-300:   #4fc3f7;
          --cyan-200:   #80d8ff;
          --cyan-glow:  rgba(61,181,230,0.35);
          --success:    #10b981;
          --error:      #ef4444;
          --font:       'Sora', sans-serif;
          --mono:       'JetBrains Mono', monospace;
          --rp-bg:              #f7fbfd;
          --rp-text:            #1a2e3b;
          --rp-sub:             #5c7a8a;
          --rp-label:           #4a6577;
          --rp-input-bg:        #edf6fb;
          --rp-input-border:    #cce8f4;
          --rp-input-focus-bg:  #e2f3fb;
          --rp-footer-border:   #d6edf8;
          --rp-muted:           #8da8b8;
        }

        /* ── Root — fixed, never scrolls ── */
        .vo-root {
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem; font-family: var(--font); overflow: hidden;
        }

        /* ── Background ── */
        .vo-bg { position: absolute; inset: 0; z-index: 0; background: linear-gradient(145deg, #e8f6fd 0%, #dff1fa 40%, #cce8f6 100%); }
        .vo-bg__mesh {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 70% 55% at 15% 15%, rgba(61,181,230,.18) 0%, transparent 60%),
            radial-gradient(ellipse 55% 70% at 85% 85%, rgba(79,195,247,.14) 0%, transparent 55%);
        }
        .vo-bg__orb { position: absolute; border-radius: 50%; filter: blur(70px); animation: voOrbFloat 22s ease-in-out infinite; }
        .vo-bg__orb--1 { width: 550px; height: 550px; top: -180px; left: -120px; background: radial-gradient(circle, rgba(61,181,230,.22) 0%, transparent 65%); }
        .vo-bg__orb--2 { width: 450px; height: 450px; bottom: -120px; right: -80px; background: radial-gradient(circle, rgba(79,195,247,.18) 0%, transparent 65%); animation-delay: 9s; }
        @keyframes voOrbFloat { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(25px,-18px) scale(1.04);} 66%{transform:translate(-18px,22px) scale(.97);} }
        .vo-bg__grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(61,181,230,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(61,181,230,.07) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%);
        }

        /* ── Particles ── */
        .vo-particles { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
        .vo-particle { position: absolute; border-radius: 50%; animation: voParticleDrift 5s ease-in-out infinite; opacity: 0; }
        .vo-particle--0 { width: 3px; height: 3px; background: var(--cyan-400); }
        .vo-particle--1 { width: 2px; height: 2px; background: var(--cyan-300); }
        .vo-particle--2 { width: 4px; height: 4px; background: rgba(61,181,230,.5); }
        .vo-particle--3 { width: 2px; height: 2px; background: var(--cyan-200); }
        @keyframes voParticleDrift { 0%,100%{opacity:0;transform:translateY(0) scale(.5);} 30%,70%{opacity:.7;} 50%{transform:translateY(-36px) scale(1);opacity:.5;} }

        /* ── Card — compact ── */
        .vo-card {
          position: relative; z-index: 2;
          display: flex; width: 100%;
          max-width: 730px;                /* ← smaller (was 800px) */
          border-radius: 22px; overflow: hidden;
          border: 1px solid rgba(61,181,230,.22);
          box-shadow: 0 0 0 1px rgba(255,255,255,.5), 0 24px 52px rgba(26,138,181,.13), 0 0 72px rgba(61,181,230,.07), inset 0 1px 0 rgba(255,255,255,.8);
        }

        /* ── Left panel — compact ── */
        .vo-left {
          position: relative; flex: 0 0 36%;
          background: linear-gradient(155deg, #0f3a4a 0%, #0a2233 55%, #060e17 100%);
          display: flex; flex-direction: column;
          padding: 1.75rem 1.75rem;        /* ← tighter */
          overflow: hidden;
        }
        .vo-left::after { content:''; position:absolute; top:0; right:0; width:1px; height:100%; background:linear-gradient(to bottom, transparent 0%, rgba(61,181,230,.3) 30%, rgba(61,181,230,.5) 60%, transparent 100%); }
        .vo-left__inner { position:relative; z-index:2; display:flex; flex-direction:column; height:100%; }
        .vo-left__line { width:36px; height:2px; background:linear-gradient(90deg, var(--cyan-400), var(--cyan-200)); border-radius:2px; margin-bottom:1.4rem; box-shadow:0 0 8px var(--cyan-glow); }

        /* Logo — smaller */
        .vo-logo { position:relative; width:62px; height:62px; margin-bottom:1.2rem; }
        .vo-logo__ring { width:62px; height:62px; border-radius:17px; border:1.5px solid rgba(61,181,230,.4); display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg, rgba(61,181,230,.12) 0%, rgba(12,45,58,.6) 100%); box-shadow:inset 0 1px 0 rgba(255,255,255,.08), 0 5px 20px rgba(0,0,0,.4); }
        .vo-logo__inner { width:45px; height:45px; border-radius:12px; background:linear-gradient(135deg, #1a5068 0%, #0d3346 100%); display:flex; align-items:center; justify-content:center; border:1px solid rgba(61,181,230,.25); }
        .vo-logo__emoji { font-size:1.4rem; filter:drop-shadow(0 2px 6px rgba(0,0,0,.5)); }
        .vo-logo__glow { position:absolute; inset:-10px; border-radius:24px; background:radial-gradient(circle, rgba(61,181,230,.2) 0%, transparent 65%); z-index:-1; animation:voLogoGlow 3s ease-in-out infinite; }
        @keyframes voLogoGlow { 0%,100%{opacity:.5;transform:scale(1);}50%{opacity:1;transform:scale(1.08);} }

        .vo-left__eyebrow { font-family:var(--mono); font-size:.58rem; letter-spacing:.16em; color:var(--cyan-400); margin-bottom:.5rem; opacity:.85; }
        .vo-left__title { font-size:1.75rem; font-weight:800; line-height:1.1; letter-spacing:-.7px; color:#fff; white-space:pre-line; margin-bottom:.85rem; text-shadow:0 2px 20px rgba(0,0,0,.4); }
        .vo-left__subtitle { font-size:.78rem; font-weight:300; line-height:1.6; color:rgba(200,225,235,.75); margin-bottom:1rem; }

        /* Email chip — compact */
        .vo-email-chip { display:inline-flex; align-items:center; gap:.4rem; padding:.35rem .7rem; border-radius:100px; background:rgba(61,181,230,.12); border:1px solid rgba(61,181,230,.28); margin-bottom:.7rem; max-width:100%; overflow:hidden; }
        .vo-email-chip__dot { width:5px; height:5px; border-radius:50%; background:var(--cyan-400); flex-shrink:0; animation:voPulse 2s ease-in-out infinite; }
        .vo-email-chip__text { font-family:var(--mono); font-size:.58rem; color:rgba(200,230,245,.85); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        /* Timer display — compact */
        .vo-timer-display { padding:.5rem .75rem; border-radius:9px; background:rgba(61,181,230,.08); border:1px solid rgba(61,181,230,.2); display:flex; flex-direction:column; gap:.15rem; }
        .vo-timer-display--urgent { background:rgba(239,68,68,.1); border-color:rgba(239,68,68,.3); }
        .vo-timer-display__label { font-family:var(--mono); font-size:.54rem; letter-spacing:.1em; color:rgba(200,225,235,.55); text-transform:uppercase; }
        .vo-timer-display__value { font-family:var(--mono); font-size:1.2rem; font-weight:700; color:var(--cyan-300); letter-spacing:.05em; }
        .vo-timer-display--urgent .vo-timer-display__value { color:#f87171; }

        .vo-left__deco { margin-top:auto; display:flex; gap:4px; align-items:flex-end; }
        .vo-deco-bar { width:3px; height:18px; border-radius:2px; background:linear-gradient(to top, var(--cyan-400), transparent); opacity:.5; }
        .vo-deco-bar--2 { height:26px; opacity:.7; }
        .vo-deco-bar--3 { height:13px; opacity:.4; }
        .vo-left__corner-glow { position:absolute; bottom:-80px; right:-80px; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle, rgba(61,181,230,.12) 0%, transparent 65%); filter:blur(20px); z-index:1; pointer-events:none; }

        /* ── Right panel — compact ── */
        .vo-right { flex:1; background:var(--rp-bg); padding:1.75rem 2rem 1.5rem; display:flex; flex-direction:column; position:relative; overflow:hidden; min-width:0; }
        .vo-right::before { content:''; position:absolute; top:-70px; right:-70px; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle, rgba(61,181,230,.09) 0%, transparent 65%); filter:blur(28px); pointer-events:none; }

        /* Form header */
        .vo-form-head { margin-bottom:.85rem; }
        .vo-form-icon { width:38px; height:38px; border-radius:12px; background:linear-gradient(135deg, rgba(61,181,230,.15) 0%, rgba(61,181,230,.06) 100%); border:1px solid rgba(61,181,230,.3); display:flex; align-items:center; justify-content:center; color:var(--cyan-400); margin-bottom:.75rem; box-shadow:0 3px 10px rgba(61,181,230,.12); }
        .vo-form-title { font-size:1.3rem; font-weight:700; letter-spacing:-.35px; color:var(--rp-text); margin-bottom:.2rem; }
        .vo-form-sub { font-size:.76rem; color:var(--rp-sub); font-weight:300; }

        /* Divider */
        .vo-divider { display:flex; align-items:center; gap:8px; margin:.75rem 0 .95rem; }
        .vo-divider__track { flex:1; height:1.5px; background:rgba(61,181,230,.2); border-radius:2px; overflow:hidden; position:relative; }
        .vo-divider__fill { position:absolute; top:0; left:0; height:100%; width:55%; background:linear-gradient(90deg, transparent 0%, var(--cyan-400) 50%, transparent 100%); animation:voDividerShimmer 3.5s ease-in-out infinite; }
        .vo-divider__fill--rev { animation:voDividerShimmerRev 3.5s ease-in-out infinite; }
        @keyframes voDividerShimmer { 0%{transform:translateX(-110%);opacity:0;} 20%,80%{opacity:1;} 100%{transform:translateX(210%);opacity:0;} }
        @keyframes voDividerShimmerRev { 0%{transform:translateX(210%);opacity:0;} 20%,80%{opacity:1;} 100%{transform:translateX(-110%);opacity:0;} }
        .vo-divider__badge { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:100px; background:linear-gradient(135deg, rgba(61,181,230,.12) 0%, rgba(61,181,230,.04) 100%); border:1px solid rgba(61,181,230,.28); box-shadow:0 2px 8px rgba(61,181,230,.1), inset 0 1px 0 rgba(255,255,255,.8); white-space:nowrap; flex-shrink:0; }
        .vo-divider__icon { display:flex; align-items:center; color:var(--cyan-400); }
        .vo-divider__text { font-family:var(--mono); font-size:.56rem; font-weight:600; letter-spacing:.13em; color:var(--cyan-500); }

        /* Alert */
        .vo-alert { display:flex; align-items:flex-start; gap:.6rem; padding:.7rem .85rem; border-radius:9px; font-size:.78rem; font-weight:500; }
        .vo-alert--error { background:rgba(239,68,68,.07); border:1px solid rgba(239,68,68,.2); color:#dc2626; }
        .vo-alert__icon { flex-shrink:0; font-size:.9rem; margin-top:1px; }
        .vo-alert__close { margin-left:auto; background:none; border:none; color:inherit; cursor:pointer; opacity:.5; transition:opacity .2s; display:flex; align-items:center; padding:2px; flex-shrink:0; }
        .vo-alert__close:hover { opacity:1; }

        /* Form */
        .vo-form { flex:1; display:flex; flex-direction:column; }
        .vo-field { margin-bottom:.85rem; }
        .vo-label { display:flex; align-items:center; gap:.38rem; font-size:.65rem; font-weight:600; letter-spacing:.08em; color:var(--rp-label); margin-bottom:.4rem; text-transform:uppercase; transition:color .2s ease; }
        .vo-field--focus .vo-label { color:var(--cyan-400); }
        .vo-field--error .vo-label { color:var(--error); }
        .vo-label__icon { font-size:.6rem; }

        .vo-input-wrap { position:relative; }
        .vo-input { width:100%; padding:.68rem .95rem; background:var(--rp-input-bg); border:1.5px solid var(--rp-input-border); border-radius:9px; font-family:var(--font); font-size:.86rem; color:var(--rp-text); outline:none; transition:all .2s ease; }
        .vo-input::placeholder { color:#9abfcf; }
        .vo-input:hover { background:#e4f2fa; border-color:rgba(61,181,230,.45); }
        .vo-field--focus .vo-input { background:var(--rp-input-focus-bg); border-color:var(--cyan-400); box-shadow:0 0 0 3px rgba(61,181,230,.11); }
        .vo-field--error .vo-input { border-color:rgba(239,68,68,.4); background:rgba(239,68,68,.03); }
        .vo-input--otp { letter-spacing:6px; font-size:1.1rem; font-family:var(--mono); font-weight:700; text-align:center; }
        .vo-input--password { padding-right:2.75rem; }
        .vo-input-bar { position:absolute; bottom:0; left:9px; height:2px; width:0; border-radius:1px; background:linear-gradient(90deg, var(--cyan-400), var(--cyan-200)); transition:width .3s ease; box-shadow:0 0 6px rgba(61,181,230,.5); }
        .vo-field--focus .vo-input-bar { width:calc(100% - 18px); }

        .vo-eye-btn { position:absolute; right:.75rem; top:50%; transform:translateY(-50%); background:none; border:none; color:#9ab8c8; cursor:pointer; padding:3px 5px; border-radius:6px; transition:all .2s ease; display:flex; align-items:center; font-size:.85rem; }
        .vo-eye-btn:hover { color:var(--cyan-400); background:rgba(61,181,230,.08); }

        /* Submit */
        .vo-submit { position:relative; display:flex; align-items:center; width:100%; border:none; border-radius:11px; padding:0; cursor:pointer; overflow:hidden; transition:transform .2s ease, box-shadow .2s ease; box-shadow:0 4px 16px rgba(61,181,230,.26); margin-top:.15rem; }
        .vo-submit__bg { position:absolute; inset:0; background:linear-gradient(135deg, #3db5e6 0%, #1a8ab5 50%, #0d6a8e 100%); }
        .vo-submit__shine { position:absolute; inset:0; background:linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%); opacity:0; transition:opacity .2s ease; }
        .vo-submit:hover:not(:disabled) .vo-submit__shine { opacity:1; }
        .vo-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 7px 24px rgba(61,181,230,.4); }
        .vo-submit:active:not(:disabled) { transform:translateY(0); }
        .vo-submit:disabled { opacity:.5; cursor:not-allowed; }
        .vo-submit__content { position:relative; z-index:1; display:flex; align-items:center; justify-content:center; gap:.5rem; width:100%; padding:.78rem 1.5rem; font-family:var(--font); font-size:.88rem; font-weight:700; letter-spacing:.04em; color:#fff; }
        .vo-submit__arrow { font-size:.72rem; transition:transform .2s ease; }
        .vo-submit:hover .vo-submit__arrow { transform:translateX(4px); }
        .vo-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:white; border-radius:50%; animation:voSpin .7s linear infinite; }
        @keyframes voSpin { to{transform:rotate(360deg);} }

        /* Resend row */
        .vo-resend-row { display:flex; align-items:center; justify-content:space-between; margin-top:.55rem; padding:.5rem .7rem; border-radius:8px; background:rgba(61,181,230,.05); border:1px solid rgba(61,181,230,.14); }
        .vo-timer-badge { font-family:var(--mono); font-size:.67rem; font-weight:600; color:var(--cyan-500); letter-spacing:.05em; }
        .vo-timer-badge--urgent { color:#dc2626; }
        .vo-resend-btn { display:inline-flex; align-items:center; gap:.28rem; background:none; border:none; font-family:var(--font); font-size:.72rem; font-weight:600; color:var(--rp-muted); cursor:not-allowed; transition:all .2s ease; padding:.28rem .5rem; border-radius:7px; }
        .vo-resend-btn--active { color:var(--cyan-400); cursor:pointer; }
        .vo-resend-btn--active:hover { background:rgba(61,181,230,.1); }

        .vo-form-link-row { display:flex; align-items:center; margin-top:.45rem; }
        .vo-text-btn { display:inline-flex; align-items:center; gap:.32rem; background:none; border:none; color:var(--rp-sub); font-family:var(--font); font-size:.75rem; font-weight:500; cursor:pointer; text-decoration:none; padding:.35rem .5rem; border-radius:7px; transition:all .2s ease; }
        .vo-text-btn:hover { color:var(--cyan-400); background:rgba(61,181,230,.07); }

        /* Footer */
        .vo-footer { display:flex; align-items:center; justify-content:space-between; margin-top:.8rem; padding-top:.75rem; border-top:1px solid var(--rp-footer-border); flex-wrap:wrap; gap:.35rem; }
        .vo-security-badge { display:inline-flex; align-items:center; gap:.38rem; font-family:var(--mono); font-size:.6rem; letter-spacing:.07em; color:var(--rp-muted); }
        .vo-security-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; background:var(--success); box-shadow:0 0 5px rgba(16,185,129,.5); animation:voPulse 2s ease-in-out infinite; }
        @keyframes voPulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.6;transform:scale(.85);} }
        .vo-home-link { display:inline-flex; align-items:center; gap:.32rem; font-size:.72rem; font-weight:600; color:var(--cyan-400); text-decoration:none; padding:.3rem .6rem; border-radius:7px; transition:all .2s ease; border:1px solid transparent; }
        .vo-home-link:hover { background:rgba(61,181,230,.08); border-color:rgba(61,181,230,.22); color:var(--cyan-500); }

        /* ═══ RESPONSIVE ═══ */

        /* Large desktop ≥ 1400px */
        @media (min-width: 1400px) {
          .vo-card { max-width: 820px; }
          .vo-left { padding: 2.25rem 2rem; }
          .vo-right { padding: 2rem 2.5rem 1.75rem; }
          .vo-left__title { font-size: 2.1rem; }
        }

        /* Standard desktop 1024–1399px */
        @media (max-width: 1399px) and (min-width: 1024px) {
          .vo-card { max-width: 730px; }
        }

        /* Small desktop / laptop 768–1023px */
        @media (max-width: 1023px) and (min-width: 768px) {
          .vo-card { max-width: 640px; }
          .vo-left { flex: 0 0 35%; padding: 1.5rem 1.35rem; }
          .vo-right { padding: 1.5rem 1.6rem 1.35rem; }
          .vo-left__title { font-size: 1.55rem; }
          .vo-logo { width: 54px; height: 54px; }
          .vo-logo__ring { width: 54px; height: 54px; border-radius: 14px; }
          .vo-logo__inner { width: 39px; height: 39px; border-radius: 11px; }
          .vo-logo__emoji { font-size: 1.25rem; }
          .vo-left__subtitle { font-size: .73rem; }
          .vo-timer-display__value { font-size: 1.05rem; }
        }

        /* Tablet landscape 600–767px — horizontal header strip */
        @media (max-width: 767px) and (min-width: 600px) {
          .vo-card { flex-direction: column; border-radius: 18px; max-width: 500px; }
          .vo-left { flex:unset; flex-direction:row; align-items:center; padding:.85rem 1.35rem; gap:.85rem; }
          .vo-left__inner { flex-direction:row; flex-wrap:nowrap; align-items:center; gap:.85rem; height:auto; width:100%; }
          .vo-left__line, .vo-left__deco, .vo-left__subtitle, .vo-email-chip, .vo-timer-display { display:none; }
          .vo-left::after { display:none; }
          .vo-logo { width:42px; height:42px; margin:0; flex-shrink:0; }
          .vo-logo__ring { width:42px; height:42px; border-radius:11px; }
          .vo-logo__inner { width:30px; height:30px; border-radius:8px; }
          .vo-logo__emoji { font-size:1rem; }
          .vo-logo__glow { display:none; }
          .vo-left__text { flex:1; min-width:0; }
          .vo-left__eyebrow { font-size:.52rem; margin-bottom:.08rem; }
          .vo-left__title { font-size:.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; letter-spacing:-.1px; margin-bottom:0; }
          .vo-right { padding: 1.5rem 1.35rem 1.35rem; }
        }

        /* Phone portrait ≤ 599px — centred card, no left panel */
        @media (max-width: 599px) {
          .vo-root { padding:1rem; align-items:center; justify-content:center; overflow:hidden; }
          .vo-card { flex-direction:column; border-radius:18px; width:100%; max-width:390px; margin:auto; }
          .vo-left { display:none; }
          .vo-right { padding:1.6rem 1.3rem 1.35rem; border-radius:18px; }
          .vo-right::before { display:none; }
          .vo-form-link-row { justify-content:center; }
          .vo-footer { justify-content:center; text-align:center; }
        }

        /* Very small phones ≤ 374px */
        @media (max-width: 374px) {
          .vo-root { padding:.5rem; }
          .vo-right { padding:1.35rem 1rem 1.2rem; }
          .vo-form-title { font-size:1.15rem; }
          .vo-input { padding:.6rem .8rem; font-size:.82rem; }
          .vo-input--otp { font-size:.95rem; letter-spacing:4px; }
          .vo-submit__content { padding:.7rem 1.1rem; font-size:.82rem; }
          .vo-field { margin-bottom:.7rem; }
        }

        /* Landscape phones height ≤ 500px */
        @media (max-height: 500px) and (orientation: landscape) {
          .vo-root { overflow:hidden; padding:.35rem; }
          .vo-card { border-radius:13px; }
          .vo-left { display:none; }
          .vo-right { padding:.85rem 1.1rem .75rem; border-radius:13px; }
          .vo-form-head { margin-bottom:.45rem; }
          .vo-form-icon { width:32px; height:32px; margin-bottom:.4rem; }
          .vo-divider { margin:.45rem 0 .65rem; }
          .vo-field { margin-bottom:.6rem; }
          .vo-input { padding:.5rem .8rem; font-size:.82rem; }
          .vo-submit__content { padding:.65rem 1.35rem; font-size:.83rem; }
          .vo-resend-row { margin-top:.45rem; padding:.4rem .6rem; }
          .vo-footer { margin-top:.55rem; padding-top:.5rem; }
        }

        /* Landscape tablets height 501–700px */
        @media (max-height: 700px) and (min-height: 501px) {
          .vo-right { padding:1.35rem 1.75rem 1.1rem; }
          .vo-field { margin-bottom:.72rem; }
          .vo-divider { margin:.6rem 0 .8rem; }
          .vo-footer { margin-top:.65rem; }
        }
      `}</style>
    </div>
  );
}