import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";

import {
  FaEnvelope,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaTimes,
  FaShieldAlt,
  FaArrowRight,
  FaHome,
  FaPaperPlane,
} from "react-icons/fa";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/forgot-password", { email });

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

      setTimeout(() => {
        navigate("/verify-otp", { state: { email } });
      }, 1500);
    } catch (err) {
      const errorCode = err.response?.data?.code;
      const errorMsg = err.response?.data?.message || "Failed to send OTP";

      if (errorCode === "EMAIL_NOT_FOUND") {
        setError("Please enter a valid or registered email address.");
      } else if (errorCode === "RATE_LIMIT_EXCEEDED") {
        setError(
          "⏰ Too many requests. Please wait 1 hour before trying again.",
        );
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
    <div className="fp-root">
      <ToastContainer position="top-right" />

      {/* ── Background ── */}
      <div className="fp-bg">
        <div className="fp-bg__mesh" />
        <div className="fp-bg__orb fp-bg__orb--1" />
        <div className="fp-bg__orb fp-bg__orb--2" />
        <div className="fp-bg__grid" />
      </div>

      {/* ── Particles ── */}
      <div className="fp-particles">
        {[...Array(10)].map((_, i) => (
          <span
            key={i}
            className={`fp-particle fp-particle--${i % 4}`}
            style={{
              left: `${i * 10 + 5}%`,
              top: `${(i * 9 + 8) % 88}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${5 + (i % 3) * 1.5}s`,
            }}
          />
        ))}
      </div>

      {/* ── Card ── */}
      <motion.div
        className="fp-card"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ══ LEFT PANEL ══ */}
        <div className="fp-left">
          <div className="fp-left__inner">
            <div className="fp-left__line" />

            {/* Logo */}
            <motion.div
              className="fp-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="fp-logo__ring">
                <div className="fp-logo__inner">
                  <span className="fp-logo__emoji">🔐</span>
                </div>
              </div>
              <div className="fp-logo__glow" />
            </motion.div>

            {/* Text */}
            <motion.div
              className="fp-left__text"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <p className="fp-left__eyebrow">SMART COLLEGE PORTAL</p>
              <h1 className="fp-left__title">{"Recover\nYour Access"}</h1>
              <p className="fp-left__subtitle">
                We'll send a one-time password to your registered email to
                verify your identity.
              </p>
            </motion.div>

            {/* Info steps */}
            <motion.div
              className="fp-left__steps"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {[
                { icon: "📧", text: "Enter your email" },
                { icon: "🔢", text: "Receive OTP code" },
                { icon: "🔑", text: "Set new password" },
              ].map((s, i) => (
                <div key={i} className="fp-step">
                  <span className="fp-step__icon">{s.icon}</span>
                  <span className="fp-step__text">{s.text}</span>
                </div>
              ))}
            </motion.div>

            <div className="fp-left__deco">
              <div className="fp-deco-bar" />
              <div className="fp-deco-bar fp-deco-bar--2" />
              <div className="fp-deco-bar fp-deco-bar--3" />
            </div>
          </div>
          <div className="fp-left__corner-glow" />
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div className="fp-right">
          {/* Header */}
          <motion.div
            className="fp-form-head"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div className="fp-form-icon">
              <FaEnvelope size={18} />
            </div>
            <h2 className="fp-form-title">Forgot Password?</h2>
            <p className="fp-form-sub">
              No worries — enter your email and we'll send you an OTP.
            </p>
          </motion.div>

          {/* Divider */}
          <div className="fp-divider">
            <div className="fp-divider__track">
              <div className="fp-divider__fill" />
            </div>
            <div className="fp-divider__badge">
              <span className="fp-divider__icon">
                <FaShieldAlt size={9} />
              </span>
              <span className="fp-divider__text">SECURE RECOVERY</span>
            </div>
            <div className="fp-divider__track">
              <div className="fp-divider__fill fp-divider__fill--rev" />
            </div>
          </div>

          {/* Error Alert */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="err"
                className="fp-alert fp-alert--error"
                initial={{
                  opacity: 0,
                  y: -10,
                  maxHeight: 0,
                  marginBottom: 0,
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  maxHeight: 120,
                  marginBottom: "1rem",
                  paddingTop: "0.75rem",
                  paddingBottom: "0.75rem",
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                  maxHeight: 0,
                  marginBottom: 0,
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <FaExclamationCircle className="fp-alert__icon" />
                <span>{error}</span>
                <button
                  className="fp-alert__close"
                  onClick={() => setError("")}
                >
                  <FaTimes />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="fp-form">
            <motion.div
              className={`fp-field ${focusedField === "email" ? "fp-field--focus" : ""} ${error ? "fp-field--error" : ""}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <label className="fp-label">
                <FaEnvelope className="fp-label__icon" />
                Email Address
              </label>
              <div className="fp-input-wrap">
                <input
                  type="email"
                  className="fp-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField("")}
                  required
                  autoComplete="email"
                />
                <div className="fp-input-bar" />
              </div>
              <p className="fp-field-hint">
                We'll send a 6-digit OTP to this email address.
              </p>
            </motion.div>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button
                type="submit"
                className={`fp-submit ${loading ? "fp-submit--loading" : ""}`}
                disabled={loading}
              >
                <span className="fp-submit__bg" />
                <span className="fp-submit__shine" />
                <span className="fp-submit__content">
                  {loading ? (
                    <>
                      <span className="fp-spinner" />
                      <span>Sending OTP…</span>
                    </>
                  ) : (
                    <>
                      <FaPaperPlane style={{ fontSize: "0.8rem" }} />
                      <span>Send OTP</span>
                      <FaArrowRight className="fp-submit__arrow" />
                    </>
                  )}
                </span>
              </button>
            </motion.div>

            {/* Back link */}
            <motion.div
              className="fp-form-link-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Link to="/login" className="fp-text-btn">
                <FaArrowLeft style={{ fontSize: "0.7rem" }} />
                Back to Login
              </Link>
            </motion.div>
          </form>

          {/* Info box */}
          <motion.div
            className="fp-info-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            <div className="fp-info-box__header">
              <span className="fp-info-box__dot" />
              <span className="fp-info-box__title">Good to know</span>
            </div>
            <ul className="fp-info-box__list">
              <li>
                OTP is valid for <strong>10 minutes</strong> only
              </li>
              <li>
                Check your <strong>spam folder</strong> if you don't see it
              </li>
              <li>
                Maximum <strong>3 OTPs</strong> per hour
              </li>
            </ul>
          </motion.div>

          {/* Footer */}
          <motion.div
            className="fp-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <span className="fp-security-badge">
              <span className="fp-security-dot" />
              Secured by NOVAA
            </span>
            <a href="/" className="fp-home-link">
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
        .fp-root {
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem; font-family: var(--font); overflow: hidden;
        }

        /* ── Background ── */
        .fp-bg { position: absolute; inset: 0; z-index: 0; background: linear-gradient(145deg, #e8f6fd 0%, #dff1fa 40%, #cce8f6 100%); }
        .fp-bg__mesh {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 70% 55% at 15% 15%, rgba(61,181,230,.18) 0%, transparent 60%),
            radial-gradient(ellipse 55% 70% at 85% 85%, rgba(79,195,247,.14) 0%, transparent 55%),
            radial-gradient(ellipse 45% 45% at 50% 50%, rgba(128,216,255,.1) 0%, transparent 70%);
        }
        .fp-bg__orb { position: absolute; border-radius: 50%; filter: blur(70px); animation: fpOrbFloat 22s ease-in-out infinite; }
        .fp-bg__orb--1 { width: 550px; height: 550px; top: -180px; left: -120px; background: radial-gradient(circle, rgba(61,181,230,.22) 0%, transparent 65%); }
        .fp-bg__orb--2 { width: 450px; height: 450px; bottom: -120px; right: -80px; background: radial-gradient(circle, rgba(79,195,247,.18) 0%, transparent 65%); animation-delay: 9s; }
        @keyframes fpOrbFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(25px,-18px) scale(1.04); }
          66%      { transform: translate(-18px,22px) scale(.97); }
        }
        .fp-bg__grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(61,181,230,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(61,181,230,.07) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%);
        }

        /* ── Particles ── */
        .fp-particles { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
        .fp-particle  { position: absolute; border-radius: 50%; animation: fpParticleDrift 5s ease-in-out infinite; opacity: 0; }
        .fp-particle--0 { width: 3px; height: 3px; background: var(--cyan-400); }
        .fp-particle--1 { width: 2px; height: 2px; background: var(--cyan-300); }
        .fp-particle--2 { width: 4px; height: 4px; background: rgba(61,181,230,.5); }
        .fp-particle--3 { width: 2px; height: 2px; background: var(--cyan-200); }
        @keyframes fpParticleDrift {
          0%,100% { opacity: 0; transform: translateY(0) scale(.5); }
          30%,70%  { opacity: .7; }
          50%      { transform: translateY(-36px) scale(1); opacity: .5; }
        }

        /* ── Card — compact ── */
        .fp-card {
          position: relative; z-index: 2;
          display: flex; width: 100%;
          max-width: 700px;                /* ← smaller than before (was 760px) */
          border-radius: 22px; overflow: hidden;
          border: 1px solid rgba(61,181,230,.22);
          box-shadow:
            0 0 0 1px rgba(255,255,255,.5),
            0 24px 52px rgba(26,138,181,.13),
            0 0 72px rgba(61,181,230,.07),
            inset 0 1px 0 rgba(255,255,255,.8);
        }

        /* ── Left panel ── */
        .fp-left {
          position: relative; flex: 0 0 37%;
          background: linear-gradient(155deg, #0f3a4a 0%, #0a2233 55%, #060e17 100%);
          display: flex; flex-direction: column;
          padding: 1.75rem 1.75rem;        /* ← tighter padding */
          overflow: hidden;
        }
        .fp-left::after {
          content: ''; position: absolute; top: 0; right: 0;
          width: 1px; height: 100%;
          background: linear-gradient(to bottom, transparent 0%, rgba(61,181,230,.3) 30%, rgba(61,181,230,.5) 60%, transparent 100%);
        }
        .fp-left__inner { position: relative; z-index: 2; display: flex; flex-direction: column; height: 100%; }
        .fp-left__line {
          width: 36px; height: 2px;
          background: linear-gradient(90deg, var(--cyan-400), var(--cyan-200));
          border-radius: 2px; margin-bottom: 1.4rem;
          box-shadow: 0 0 8px var(--cyan-glow);
        }

        /* Logo — smaller */
        .fp-logo { position: relative; width: 62px; height: 62px; margin-bottom: 1.2rem; }
        .fp-logo__ring {
          width: 62px; height: 62px; border-radius: 17px;
          border: 1.5px solid rgba(61,181,230,.4);
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(61,181,230,.12) 0%, rgba(12,45,58,.6) 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 5px 20px rgba(0,0,0,.4);
        }
        .fp-logo__inner {
          width: 45px; height: 45px; border-radius: 12px;
          background: linear-gradient(135deg, #1a5068 0%, #0d3346 100%);
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(61,181,230,.25);
        }
        .fp-logo__emoji { font-size: 1.4rem; filter: drop-shadow(0 2px 6px rgba(0,0,0,.5)); }
        .fp-logo__glow {
          position: absolute; inset: -10px; border-radius: 24px;
          background: radial-gradient(circle, rgba(61,181,230,.2) 0%, transparent 65%);
          z-index: -1; animation: fpLogoGlow 3s ease-in-out infinite;
        }
        @keyframes fpLogoGlow { 0%,100% { opacity: .5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }

        .fp-left__eyebrow { font-family: var(--mono); font-size: .58rem; letter-spacing: .16em; color: var(--cyan-400); margin-bottom: .5rem; opacity: .85; }
        .fp-left__title { font-size: 1.75rem; font-weight: 800; line-height: 1.1; letter-spacing: -.7px; color: #fff; white-space: pre-line; margin-bottom: .85rem; text-shadow: 0 2px 20px rgba(0,0,0,.4); }
        .fp-left__subtitle { font-size: .78rem; font-weight: 300; line-height: 1.6; color: rgba(200,225,235,.75); margin-bottom: 1.25rem; }

        .fp-left__steps { display: flex; flex-direction: column; gap: .5rem; }
        .fp-step { display: flex; align-items: center; gap: .55rem; }
        .fp-step__icon { font-size: .9rem; width: 24px; text-align: center; flex-shrink: 0; }
        .fp-step__text { font-size: .74rem; font-weight: 400; color: rgba(200,225,235,.8); }

        .fp-left__deco { margin-top: auto; display: flex; gap: 4px; align-items: flex-end; }
        .fp-deco-bar { width: 3px; height: 18px; border-radius: 2px; background: linear-gradient(to top, var(--cyan-400), transparent); opacity: .5; }
        .fp-deco-bar--2 { height: 26px; opacity: .7; }
        .fp-deco-bar--3 { height: 13px; opacity: .4; }
        .fp-left__corner-glow {
          position: absolute; bottom: -80px; right: -80px;
          width: 200px; height: 200px; border-radius: 50%;
          background: radial-gradient(circle, rgba(61,181,230,.12) 0%, transparent 65%);
          filter: blur(20px); z-index: 1; pointer-events: none;
        }

        /* ── Right panel ── */
        .fp-right {
          flex: 1; background: var(--rp-bg);
          padding: 1.75rem 2rem 1.5rem;    /* ← tighter padding */
          display: flex; flex-direction: column;
          position: relative; overflow: hidden; min-width: 0;
        }
        .fp-right::before {
          content: ''; position: absolute; top: -70px; right: -70px;
          width: 200px; height: 200px; border-radius: 50%;
          background: radial-gradient(circle, rgba(61,181,230,.09) 0%, transparent 65%);
          filter: blur(28px); pointer-events: none;
        }

        /* Form header */
        .fp-form-head { margin-bottom: .85rem; }
        .fp-form-icon {
          width: 38px; height: 38px; border-radius: 12px;  /* ← smaller icon box */
          background: linear-gradient(135deg, rgba(61,181,230,.15) 0%, rgba(61,181,230,.06) 100%);
          border: 1px solid rgba(61,181,230,.3);
          display: flex; align-items: center; justify-content: center;
          color: var(--cyan-400); margin-bottom: .75rem;
          box-shadow: 0 3px 10px rgba(61,181,230,.12);
        }
        .fp-form-title { font-size: 1.3rem; font-weight: 700; letter-spacing: -.35px; color: var(--rp-text); margin-bottom: .2rem; }
        .fp-form-sub { font-size: .76rem; color: var(--rp-sub); font-weight: 300; }

        /* Divider */
        .fp-divider { display: flex; align-items: center; gap: 8px; margin: .75rem 0 .95rem; }
        .fp-divider__track { flex: 1; height: 1.5px; background: rgba(61,181,230,.2); border-radius: 2px; overflow: hidden; position: relative; }
        .fp-divider__fill {
          position: absolute; top: 0; left: 0; height: 100%; width: 55%;
          background: linear-gradient(90deg, transparent 0%, var(--cyan-400) 50%, transparent 100%);
          animation: fpDividerShimmer 3.5s ease-in-out infinite;
        }
        .fp-divider__fill--rev { animation: fpDividerShimmerRev 3.5s ease-in-out infinite; }
        @keyframes fpDividerShimmer { 0% { transform: translateX(-110%); opacity:0; } 20%,80% { opacity:1; } 100% { transform: translateX(210%); opacity:0; } }
        @keyframes fpDividerShimmerRev { 0% { transform: translateX(210%); opacity:0; } 20%,80% { opacity:1; } 100% { transform: translateX(-110%); opacity:0; } }
        .fp-divider__badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: 100px;
          background: linear-gradient(135deg, rgba(61,181,230,.12) 0%, rgba(61,181,230,.04) 100%);
          border: 1px solid rgba(61,181,230,.28);
          box-shadow: 0 2px 8px rgba(61,181,230,.1), inset 0 1px 0 rgba(255,255,255,.8);
          white-space: nowrap; flex-shrink: 0;
        }
        .fp-divider__icon { display: flex; align-items: center; color: var(--cyan-400); }
        .fp-divider__text { font-family: var(--mono); font-size: .56rem; font-weight: 600; letter-spacing: .13em; color: var(--cyan-500); }

        /* Alert */
        .fp-alert {
          display: flex; align-items: flex-start; gap: .6rem;
          padding: .7rem .85rem; border-radius: 9px;
          font-size: .78rem; font-weight: 500;
        }
        .fp-alert--error { background: rgba(239,68,68,.07); border: 1px solid rgba(239,68,68,.2); color: #dc2626; }
        .fp-alert__icon { flex-shrink: 0; font-size: .9rem; margin-top: 1px; }
        .fp-alert__close { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; opacity: .5; transition: opacity .2s; display: flex; align-items: center; padding: 2px; flex-shrink: 0; }
        .fp-alert__close:hover { opacity: 1; }

        /* Form */
        .fp-form { flex: 1; display: flex; flex-direction: column; }
        .fp-field { margin-bottom: .95rem; }
        .fp-label {
          display: flex; align-items: center; gap: .38rem;
          font-size: .65rem; font-weight: 600; letter-spacing: .08em;
          color: var(--rp-label); margin-bottom: .4rem;
          text-transform: uppercase; transition: color .2s ease;
        }
        .fp-field--focus .fp-label { color: var(--cyan-400); }
        .fp-field--error .fp-label { color: var(--error); }
        .fp-label__icon { font-size: .6rem; }
        .fp-field-hint { font-size: .68rem; color: var(--rp-muted); margin-top: .35rem; }

        .fp-input-wrap { position: relative; }
        .fp-input {
          width: 100%; padding: .68rem .95rem;   /* ← slightly smaller */
          background: var(--rp-input-bg);
          border: 1.5px solid var(--rp-input-border);
          border-radius: 9px;
          font-family: var(--font); font-size: .86rem;
          color: var(--rp-text); outline: none; transition: all .2s ease;
        }
        .fp-input::placeholder { color: #9abfcf; }
        .fp-input:hover { background: #e4f2fa; border-color: rgba(61,181,230,.45); }
        .fp-field--focus .fp-input { background: var(--rp-input-focus-bg); border-color: var(--cyan-400); box-shadow: 0 0 0 3px rgba(61,181,230,.11); }
        .fp-field--error .fp-input { border-color: rgba(239,68,68,.4); background: rgba(239,68,68,.03); }
        .fp-input-bar {
          position: absolute; bottom: 0; left: 9px;
          height: 2px; width: 0; border-radius: 1px;
          background: linear-gradient(90deg, var(--cyan-400), var(--cyan-200));
          transition: width .3s ease; box-shadow: 0 0 6px rgba(61,181,230,.5);
        }
        .fp-field--focus .fp-input-bar { width: calc(100% - 18px); }

        /* Submit */
        .fp-submit {
          position: relative; display: flex; align-items: center;
          width: 100%; border: none; border-radius: 11px; padding: 0;
          cursor: pointer; overflow: hidden;
          transition: transform .2s ease, box-shadow .2s ease;
          box-shadow: 0 4px 16px rgba(61,181,230,.26); margin-top: .15rem;
        }
        .fp-submit__bg { position: absolute; inset: 0; background: linear-gradient(135deg, #3db5e6 0%, #1a8ab5 50%, #0d6a8e 100%); }
        .fp-submit__shine { position: absolute; inset: 0; background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%); opacity: 0; transition: opacity .2s ease; }
        .fp-submit:hover:not(:disabled) .fp-submit__shine { opacity: 1; }
        .fp-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 7px 24px rgba(61,181,230,.4); }
        .fp-submit:active:not(:disabled) { transform: translateY(0); }
        .fp-submit:disabled { opacity: .5; cursor: not-allowed; }
        .fp-submit__content {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: center;
          gap: .5rem; width: 100%; padding: .78rem 1.5rem;  /* ← smaller padding */
          font-family: var(--font); font-size: .88rem; font-weight: 700;
          letter-spacing: .04em; color: #fff;
        }
        .fp-submit__arrow { font-size: .72rem; transition: transform .2s ease; }
        .fp-submit:hover .fp-submit__arrow { transform: translateX(4px); }
        .fp-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: white; border-radius: 50%; animation: fpSpin .7s linear infinite; }
        @keyframes fpSpin { to { transform: rotate(360deg); } }

        .fp-form-link-row { display: flex; align-items: center; margin-top: .5rem; }
        .fp-text-btn {
          display: inline-flex; align-items: center; gap: .32rem;
          background: none; border: none; color: var(--rp-sub);
          font-family: var(--font); font-size: .75rem; font-weight: 500;
          cursor: pointer; text-decoration: none;
          padding: .35rem .5rem; border-radius: 7px; transition: all .2s ease;
        }
        .fp-text-btn:hover { color: var(--cyan-400); background: rgba(61,181,230,.08); }

        /* Info box — compact */
        .fp-info-box {
          margin-top: .75rem;
          padding: .7rem .85rem;
          border-radius: 9px;
          background: rgba(61,181,230,.06);
          border: 1px solid rgba(61,181,230,.18);
        }
        .fp-info-box__header { display: flex; align-items: center; gap: .45rem; margin-bottom: .4rem; }
        .fp-info-box__dot { width: 5px; height: 5px; border-radius: 50%; background: var(--cyan-400); flex-shrink: 0; }
        .fp-info-box__title { font-family: var(--mono); font-size: .58rem; font-weight: 600; letter-spacing: .1em; color: var(--cyan-500); text-transform: uppercase; }
        .fp-info-box__list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: .25rem; }
        .fp-info-box__list li { font-size: .72rem; color: var(--rp-sub); padding-left: .9rem; position: relative; }
        .fp-info-box__list li::before { content: '·'; position: absolute; left: .2rem; color: var(--cyan-400); font-weight: bold; }

        /* Footer */
        .fp-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: .85rem; padding-top: .8rem;
          border-top: 1px solid var(--rp-footer-border);
          flex-wrap: wrap; gap: .35rem;
        }
        .fp-security-badge { display: inline-flex; align-items: center; gap: .38rem; font-family: var(--mono); font-size: .6rem; letter-spacing: .07em; color: var(--rp-muted); }
        .fp-security-dot {
          width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
          background: var(--success); box-shadow: 0 0 5px rgba(16,185,129,.5);
          animation: fpPulse 2s ease-in-out infinite;
        }
        @keyframes fpPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.6; transform:scale(.85); } }
        .fp-home-link {
          display: inline-flex; align-items: center; gap: .32rem;
          font-size: .72rem; font-weight: 600; color: var(--cyan-400);
          text-decoration: none; padding: .3rem .6rem;
          border-radius: 7px; transition: all .2s ease; border: 1px solid transparent;
        }
        .fp-home-link:hover { background: rgba(61,181,230,.08); border-color: rgba(61,181,230,.22); color: var(--cyan-500); }

        /* ═══ RESPONSIVE ═══ */

        /* Large desktop ≥ 1400px */
        @media (min-width: 1400px) {
          .fp-card { max-width: 780px; }
          .fp-left { padding: 2.25rem 2rem; }
          .fp-right { padding: 2rem 2.5rem 1.75rem; }
          .fp-left__title { font-size: 2.1rem; }
        }

        /* Standard desktop 1024–1399px */
        @media (max-width: 1399px) and (min-width: 1024px) {
          .fp-card { max-width: 700px; }
        }

        /* Small desktop / laptop 768–1023px */
        @media (max-width: 1023px) and (min-width: 768px) {
          .fp-card { max-width: 620px; }
          .fp-left { flex: 0 0 35%; padding: 1.5rem 1.35rem; }
          .fp-right { padding: 1.5rem 1.6rem 1.35rem; }
          .fp-left__title { font-size: 1.55rem; }
          .fp-logo { width: 54px; height: 54px; }
          .fp-logo__ring { width: 54px; height: 54px; border-radius: 14px; }
          .fp-logo__inner { width: 39px; height: 39px; border-radius: 11px; }
          .fp-logo__emoji { font-size: 1.25rem; }
          .fp-left__subtitle { font-size: .73rem; }
          .fp-left__steps { gap: .4rem; }
          .fp-step__text { font-size: .7rem; }
        }

        /* Tablet landscape 600–767px — horizontal header strip */
        @media (max-width: 767px) and (min-width: 600px) {
          .fp-card { flex-direction: column; border-radius: 18px; max-width: 480px; }
          .fp-left {
            flex: unset; flex-direction: row; align-items: center;
            padding: .85rem 1.35rem; gap: .85rem;
          }
          .fp-left__inner { flex-direction: row; flex-wrap: nowrap; align-items: center; gap: .85rem; height: auto; width: 100%; }
          .fp-left__line, .fp-left__deco, .fp-left__steps, .fp-left__subtitle { display: none; }
          .fp-left::after { display: none; }
          .fp-logo { width: 42px; height: 42px; margin: 0; flex-shrink: 0; }
          .fp-logo__ring { width: 42px; height: 42px; border-radius: 11px; }
          .fp-logo__inner { width: 30px; height: 30px; border-radius: 8px; }
          .fp-logo__emoji { font-size: 1rem; }
          .fp-logo__glow { display: none; }
          .fp-left__text { flex: 1; min-width: 0; }
          .fp-left__eyebrow { font-size: .52rem; margin-bottom: .08rem; }
          .fp-left__title { font-size: .95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -.1px; margin-bottom: 0; }
          .fp-right { padding: 1.5rem 1.35rem 1.35rem; }
        }

        /* Phone portrait ≤ 599px — centred card, no left panel */
        @media (max-width: 599px) {
          .fp-root { padding: 1rem; align-items: center; justify-content: center; overflow: hidden; }
          .fp-card { flex-direction: column; border-radius: 18px; width: 100%; max-width: 380px; margin: auto; }
          .fp-left { display: none; }
          .fp-right { padding: 1.6rem 1.3rem 1.35rem; border-radius: 18px; }
          .fp-right::before { display: none; }
          .fp-form-link-row { justify-content: center; }
          .fp-footer { justify-content: center; text-align: center; }
        }

        /* Very small phones ≤ 374px */
        @media (max-width: 374px) {
          .fp-root { padding: .5rem; }
          .fp-right { padding: 1.35rem 1rem 1.2rem; }
          .fp-form-title { font-size: 1.15rem; }
          .fp-input { padding: .6rem .8rem; font-size: .82rem; }
          .fp-submit__content { padding: .7rem 1.1rem; font-size: .82rem; }
          .fp-divider { margin: .5rem 0 .75rem; }
          .fp-field { margin-bottom: .8rem; }
        }

        /* Landscape phones height ≤ 500px */
        @media (max-height: 500px) and (orientation: landscape) {
          .fp-root { overflow: hidden; padding: .35rem; }
          .fp-card { border-radius: 13px; }
          .fp-left { display: none; }
          .fp-right { padding: .85rem 1.1rem .75rem; border-radius: 13px; }
          .fp-form-head { margin-bottom: .5rem; }
          .fp-form-icon { width: 32px; height: 32px; margin-bottom: .45rem; }
          .fp-info-box { display: none; }
          .fp-field { margin-bottom: .65rem; }
          .fp-input { padding: .5rem .8rem; font-size: .82rem; }
          .fp-submit__content { padding: .65rem 1.35rem; font-size: .83rem; }
          .fp-footer { margin-top: .55rem; padding-top: .5rem; }
        }

        /* Landscape tablets height 501–700px */
        @media (max-height: 700px) and (min-height: 501px) {
          .fp-right { padding: 1.35rem 1.75rem 1.1rem; }
          .fp-field { margin-bottom: .8rem; }
          .fp-divider { margin: .6rem 0 .8rem; }
          .fp-info-box { margin-top: .6rem; padding: .6rem .75rem; }
          .fp-footer { margin-top: .7rem; }
        }
      `}</style>
    </div>
  );
}