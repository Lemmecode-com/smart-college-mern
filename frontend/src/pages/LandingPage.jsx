import { useEffect, useState, useCallback, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Container, Row, Col, Button, Form, Nav } from "react-bootstrap";
import "animate.css";
import api from "../api/axios";

// Feature images from assets
import studentPortalImg from "../assets/images/studentportal.png";
import teacherPortalImg from "../assets/images/teacherportal.png";
import timetableImg from "../assets/images/timetablemgt.png";
import feeImg from "../assets/images/feemgt.png";
import analyticsImg from "../assets/images/analyticsandreportsmgt.png";
import notificationsImg from "../assets/images/notificationsmgt.png";
import heroBgImg from "../assets/images/hero-bg.jpg";

// Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: custom * 0.1,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const fadeInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

// Animated counter hook
function useCounter(end, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const ref = useRef(null);

  useEffect(() => {
    if (!startOnView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted, startOnView]);

  useEffect(() => {
    if (!hasStarted) return;
    let startTime;
    let animationFrame;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  return [count, ref];
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalColleges: 0,
    totalTeachers: 0,
    systemUptime: "99.9%",
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Fetch public stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/dashboard/public-stats");
        const data = res.data;
        if (data && data.totalColleges !== undefined) {
          setStats({
            totalColleges: data.totalColleges,
            totalStudents: data.totalStudents,
            totalTeachers: data.totalTeachers,
            systemUptime: data.systemUptime || "99.9%",
          });
        }
        setStatsLoading(false);
      } catch {
        setStats({
          totalStudents: 10000,
          totalColleges: 50,
          totalTeachers: 500,
          systemUptime: "99.9%",
        });
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      const sections = ["about", "features", "contact"];
      let currentSection = "";
      sections.forEach((sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            currentSection = sectionId;
          }
        }
      });
      setActiveSection(currentSection);
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedImage) {
        setSelectedImage(null);
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("keydown", handleKeyDown);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedImage]);

  const scrollToSection = useCallback((sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop =
        element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  }, []);

  const features = [
    {
      icon: "fa-user-graduate",
      title: "Student Management",
      description:
        "Complete student lifecycle management from admission to graduation with detailed records and analytics.",
      image: studentPortalImg,
    },
    {
      icon: "fa-chalkboard-teacher",
      title: "Teacher Portal",
      description:
        "Empower educators with tools for attendance, grading, timetables, and communication with students.",
      image: teacherPortalImg,
    },
    {
      icon: "fa-calendar-alt",
      title: "Timetable Management",
      description:
        "Intelligent scheduling system that creates conflict-free timetables for classes and exams.",
      image: timetableImg,
    },
    {
      icon: "fa-file-invoice-dollar",
      title: "Fee Management",
      description:
        "Automated fee calculation, payment processing, and financial reporting for transparent billing.",
      image: feeImg,
    },
    {
      icon: "fa-chart-line",
      title: "Analytics & Reports",
      description:
        "Comprehensive dashboards with insights on academics, attendance, and institutional performance.",
      image: analyticsImg,
    },
    {
      icon: "fa-bell",
      title: "Notifications",
      description:
        "Real-time alerts and notifications to keep all stakeholders informed about important updates.",
      image: notificationsImg,
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

        /* ============================================================
           NOVAA COLOR THEME — Deep Teal/Navy matching the live site
           ============================================================
           Primary dark:   #0a1f2b  (navbar, footer bg)
           Mid dark:       #0d2d3a  (hero dark end)
           Teal mid:       #1a5f7a  (hero mid)
           Teal vivid:     #2a8fa8  (hero light end, accents)
           Sky accent:     #38bdf8  (highlight text, logo glow, icons)
           Sky light:      #7dd3fc  (hover states, light accents)
           Sky pale:       #e0f7ff  (very light teal tints)
           Button dark:    #1a3a4a  (primary CTA buttons)
           White:          #ffffff
           Paper:          #f4f9fb  (light section bg)
           Paper warm:     #eef6f9  (slightly tinted white)
        ============================================================ */

        :root {
          /* ── Core dark tones ── */
          --ink: #0a1f2b;
          --ink-80: rgba(10,31,43,0.8);
          --ink-50: rgba(10,31,43,0.5);
          --ink-20: rgba(10,31,43,0.2);
          --ink-08: rgba(10,31,43,0.08);

          /* ── Light/paper tones ── */
          --paper: #f4f9fb;
          --paper-warm: #eef6f9;

          /* ── Teal palette (primary brand) ── */
          --teal-vivid: #38bdf8;
          --teal-mid:   #1a8aaa;
          --teal-deep:  #0d2d3a;
          --teal-pale:  #e0f7ff;

          /* ── Sky accent (replaces gold) ── */
          --gold:       #38bdf8;
          --gold-light: #7dd3fc;

          /* ── Surfaces ── */
          --white:        #ffffff;
          --surface:      #ffffff;
          --surface-warm: #f4f9fb;

          /* ── Borders ── */
          --border:      rgba(10,31,43,0.08);
          --border-teal: rgba(56,189,248,0.2);

          /* ── Shadows ── */
          --shadow-sm:   0 1px 4px rgba(10,31,43,0.07), 0 4px 16px rgba(10,31,43,0.05);
          --shadow-md:   0 4px 16px rgba(10,31,43,0.10), 0 16px 40px rgba(10,31,43,0.07);
          --shadow-lg:   0 8px 32px rgba(10,31,43,0.14), 0 32px 80px rgba(10,31,43,0.09);
          --shadow-teal: 0 8px 32px rgba(56,189,248,0.25);

          /* ── Radii ── */
          --radius-sm: 8px;
          --radius-md: 16px;
          --radius-lg: 24px;
          --radius-xl: 32px;

          /* ── Typography ── */
          --font-display: 'Playfair Display', Georgia, serif;
          --font-body:    'DM Sans', -apple-system, sans-serif;

          /* ── Gradients ── */
          --grad-teal:  linear-gradient(135deg, #38bdf8 0%, #7dd3fc 100%);
          --grad-hero:  linear-gradient(160deg, #0a1f2b 0%, #0d2d3a 40%, #1a5f7a 70%, #2a8fa8 100%);
          --grad-ink:   linear-gradient(135deg, #0a1f2b 0%, #1a3a4a 100%);
          --grad-gold:  linear-gradient(135deg, #38bdf8 0%, #7dd3fc 100%);
        }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        body {
          font-family: var(--font-body);
          background: var(--paper);
          color: var(--ink);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow-x: hidden;
        }

        /* ─── SCROLL PROGRESS ─── */
        .scroll-progress-bar {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--grad-teal);
          z-index: 10001;
          transform-origin: left;
          box-shadow: 0 0 12px rgba(56,189,248,0.7);
        }

        /* ─── NAVBAR ─── */
        .landing-navbar {
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          background: rgba(10, 31, 43, 0.88) !important;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 1.1rem 0;
          border-bottom: 1px solid rgba(56,189,248,0.08);
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .landing-navbar.scrolled {
          background: rgba(10, 31, 43, 0.98) !important;
          box-shadow: 0 1px 0 rgba(56,189,248,0.12), 0 8px 40px rgba(0,0,0,0.5);
          padding: 0.8rem 0;
        }

        .navbar-brand-landing {
          font-family: var(--font-display);
          font-weight: 700;
          color: white !important;
          font-size: 1.6rem !important;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          letter-spacing: -0.01em;
          transition: opacity 0.3s ease;
          text-decoration: none;
        }

        .navbar-brand-landing:hover { opacity: 0.85; }

        .navbar-brand-landing img {
          height: 44px;
          width: auto;
          filter: drop-shadow(0 2px 12px rgba(56,189,248,0.45));
        }

        .nav-link-landing {
          font-family: var(--font-body);
          color: rgba(255,255,255,0.78) !important;
          font-weight: 400;
          font-size: 0.9rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 0.5rem 1rem !important;
          border-radius: var(--radius-sm);
          transition: all 0.3s ease;
          position: relative;
        }

        .nav-link-landing::after {
          content: '';
          position: absolute;
          bottom: 2px; left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 20px; height: 1px;
          background: var(--teal-vivid);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-link-landing:hover::after,
        .nav-link-landing.active::after { transform: translateX(-50%) scaleX(1); }

        .nav-link-landing:hover,
        .nav-link-landing.active {
          color: var(--teal-vivid) !important;
          background: rgba(56,189,248,0.07);
        }

        .btn-nav-login {
          background: transparent !important;
          color: var(--teal-vivid) !important;
          font-family: var(--font-body);
          font-weight: 500;
          font-size: 0.875rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.55rem 1.5rem !important;
          border-radius: 3px !important;
          border: 1px solid rgba(56,189,248,0.5) !important;
          transition: all 0.35s ease;
          position: relative;
          overflow: hidden;
        }

        .btn-nav-login::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--grad-teal);
          opacity: 0;
          transition: opacity 0.35s ease;
          z-index: 0;
        }

        .btn-nav-login span, .btn-nav-login i {
          position: relative; z-index: 1;
        }

        .btn-nav-login:hover::before { opacity: 1; }
        .btn-nav-login:hover {
          color: var(--ink) !important;
          border-color: transparent !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(56,189,248,0.4) !important;
        }

        /* ─── HERO ─── */
        .hero-section-landing {
          background:
            linear-gradient(160deg, rgba(10,31,43,0.96) 0%, rgba(13,45,58,0.90) 40%, rgba(26,95,122,0.85) 70%, rgba(42,143,168,0.80) 100%),
            url(${heroBgImg}) center center / cover no-repeat;
          background-attachment: fixed;
          color: white;
          padding: 0 0 140px;
          position: relative;
          overflow: hidden;
          min-height: 100vh;
          display: flex;
          align-items: center;
        }

        /* Mesh gradient layer */
        .hero-section-landing::before {
          content: '';
          position: absolute;
          inset: -50%;
          background-image:
            radial-gradient(circle at 18% 52%, rgba(56,189,248,0.14) 0%, transparent 48%),
            radial-gradient(circle at 80% 18%, rgba(125,211,252,0.10) 0%, transparent 38%),
            radial-gradient(circle at 42% 80%, rgba(42,143,168,0.08) 0%, transparent 42%),
            radial-gradient(circle at 72% 62%, rgba(56,189,248,0.09) 0%, transparent 32%);
          pointer-events: none;
          animation: heroMeshMove 18s ease-in-out infinite alternate;
          z-index: 0;
        }

        /* Grain texture */
        .hero-section-landing::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.025'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.5;
          z-index: 1;
        }

        @keyframes heroMeshMove {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-1.5%, 2%) scale(1.02); }
          100% { transform: translate(2%, -1%) scale(0.98); }
        }

        .hero-grid-dots {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(56,189,248,0.08) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          z-index: 1;
          animation: gridFade 4s ease-in-out infinite alternate;
        }

        @keyframes gridFade {
          0% { opacity: 0.25; }
          100% { opacity: 0.6; }
        }

        .hero-lines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        .hero-lines::before {
          content: '';
          position: absolute;
          top: 22%; left: -100%;
          width: 200%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.15), transparent);
          animation: heroLineScan 10s linear infinite;
        }

        .hero-lines::after {
          content: '';
          position: absolute;
          top: 65%; left: -100%;
          width: 200%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(125,211,252,0.10), transparent);
          animation: heroLineScan 14s linear infinite reverse;
        }

        @keyframes heroLineScan {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }

        .hero-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 1;
        }

        .hero-blob-1 {
          width: 700px; height: 700px;
          background: #38bdf8;
          top: -20%; right: -12%;
          animation: blobFloat1 22s ease-in-out infinite;
        }

        .hero-blob-2 {
          width: 550px; height: 550px;
          background: #7dd3fc;
          bottom: -18%; left: -12%;
          animation: blobFloat2 20s ease-in-out infinite;
        }

        .hero-blob-3 {
          width: 400px; height: 400px;
          background: #2a8fa8;
          top: 38%; left: 42%;
          opacity: 0.08;
          animation: blobFloat3 24s ease-in-out infinite;
        }

        @keyframes blobFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -50px) scale(1.08); }
          66% { transform: translate(-35px, 35px) scale(0.94); }
        }

        @keyframes blobFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-35px, 50px) scale(1.04); }
          66% { transform: translate(45px, -25px) scale(0.92); }
        }

        @keyframes blobFloat3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.18); }
        }

        /* Diagonal accent line on hero */
        .hero-diagonal-accent {
          position: absolute;
          bottom: 0; right: 0;
          width: 40%; height: 100%;
          background: linear-gradient(135deg, transparent 60%, rgba(56,189,248,0.04) 100%);
          pointer-events: none;
          z-index: 1;
        }

        .hero-animate-wrapper .animate__animated { --animate-duration: 1.2s; }
        .hero-bounce-in-down { --animate-duration: 1s; }
        .hero-bounce-in-right { --animate-duration: 1.2s; }

        .hero-content { position: relative; z-index: 3; }

        /* Hero eyebrow label */
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(56,189,248,0.12);
          backdrop-filter: blur(12px);
          color: var(--teal-vivid);
          padding: 0.45rem 1.25rem;
          border-radius: 2px;
          font-weight: 500;
          font-size: 0.75rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 2rem;
          border: 1px solid rgba(56,189,248,0.25);
          font-family: var(--font-body);
        }

        .hero-badge i { color: var(--teal-vivid); font-size: 0.65rem; }

        .hero-title-landing {
          font-family: var(--font-display);
          font-size: clamp(3rem, 6.5vw, 5.5rem);
          font-weight: 800;
          line-height: 1.06;
          margin-bottom: 1.75rem;
          letter-spacing: -0.03em;
          padding-top: 15px;
        }

        .hero-highlight {
          background: var(--grad-teal);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-style: italic;
        }

        .hero-subtitle {
          font-family: var(--font-body);
          font-size: clamp(1rem, 1.8vw, 1.2rem);
          opacity: 0.80;
          margin-bottom: 3rem;
          line-height: 1.85;
          max-width: 680px;
          margin-left: auto;
          margin-right: auto;
          font-weight: 300;
        }

        /* Hero rule decoration */
        .hero-rule {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 2.5rem;
        }

        .hero-rule-line {
          width: 48px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.55));
        }

        .hero-rule-line.rev { background: linear-gradient(90deg, rgba(56,189,248,0.55), transparent); }

        .hero-rule-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--teal-vivid);
          opacity: 0.8;
        }

        .btn-hero-primary {
          font-family: var(--font-body);
          font-weight: 600;
          font-size: 0.875rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 1.05rem 2.5rem;
          border-radius: 3px;
          border: none;
          background: #1a3a4a;
          color: white;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(10,31,43,0.4);
          position: relative;
          overflow: hidden;
        }

        .btn-hero-primary::before {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          width: 0; height: 0;
          border-radius: 50%;
          background: rgba(56,189,248,0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s ease, height 0.6s ease;
        }

        .btn-hero-primary:hover::before { width: 300px; height: 300px; }

        .btn-hero-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(10,31,43,0.5);
          background: #0d2d3a;
          color: white;
        }

        .btn-hero-secondary {
          font-family: var(--font-body);
          font-weight: 500;
          font-size: 0.875rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 1.05rem 2.5rem;
          border-radius: 3px;
          background: transparent;
          color: rgba(255,255,255,0.92);
          border: 1px solid rgba(255,255,255,0.28);
          transition: all 0.35s ease;
          backdrop-filter: blur(8px);
        }

        .btn-hero-secondary:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(56,189,248,0.5);
          transform: translateY(-2px);
          color: white;
        }

        /* ─── SECTION BASE ─── */
        .section-landing {
          padding: 110px 0;
          position: relative;
        }

        /* Decorative corner marks */
        .section-corner-mark {
          position: absolute;
          width: 32px; height: 32px;
          pointer-events: none;
          opacity: 0.12;
        }

        .section-corner-mark.tl { top: 40px; left: 40px; border-top: 1px solid var(--teal-vivid); border-left: 1px solid var(--teal-vivid); }
        .section-corner-mark.br { bottom: 40px; right: 40px; border-bottom: 1px solid var(--teal-vivid); border-right: 1px solid var(--teal-vivid); }

        .section-heading {
          font-family: var(--font-display);
          font-size: clamp(2.2rem, 4.5vw, 3.2rem);
          font-weight: 800;
          color: var(--ink);
          margin-bottom: 0.75rem;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        .section-heading-light {
          font-family: var(--font-display);
          font-size: clamp(2.2rem, 4.5vw, 3.2rem);
          font-weight: 800;
          color: white;
          margin-bottom: 0.75rem;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        .section-subheading {
          font-family: var(--font-body);
          color: var(--ink-50);
          font-size: 1.0625rem;
          margin-top: 1.5rem;
          line-height: 1.75;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          font-weight: 300;
        }

        .section-subheading-light {
          font-family: var(--font-body);
          color: rgba(255,255,255,0.72);
          font-size: 1.0625rem;
          margin-top: 1.5rem;
          line-height: 1.75;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
          font-weight: 300;
        }

        /* Editorial underline — double line with teal dot */
        .heading-underline {
          position: relative;
          display: inline-block;
          padding-bottom: 20px;
        }

        .heading-underline::before {
          content: '';
          position: absolute;
          bottom: 8px; left: 50%;
          transform: translateX(-50%);
          width: 80px; height: 1px;
          background: var(--ink-20);
        }

        .heading-underline::after {
          content: '';
          position: absolute;
          bottom: 4px; left: 50%;
          transform: translateX(-50%);
          width: 32px; height: 2px;
          background: var(--grad-teal);
          border-radius: 1px;
        }

        /* ─── ABOUT SECTION ─── */
        .about-section-bg {
          background: var(--paper);
          position: relative;
        }

        .about-section-bg::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border), transparent);
        }

        .about-card {
          max-width: 820px;
          margin: 0 auto;
          padding: 56px 64px;
          background: var(--surface);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .about-card::before {
          content: '';
          position: absolute;
          top: 0; left: 48px; right: 48px;
          height: 2px;
          background: var(--grad-teal);
          border-radius: 0 0 2px 2px;
          opacity: 0.7;
        }

        .about-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-3px);
          border-color: rgba(56,189,248,0.15);
        }

        .about-card-headline {
          font-family: var(--font-display);
          font-weight: 700;
          color: var(--ink);
          font-size: 1.65rem;
          letter-spacing: -0.025em;
          line-height: 1.3;
          margin-bottom: 1.25rem;
        }

        .about-card-text {
          font-family: var(--font-body);
          color: var(--ink-50);
          line-height: 1.85;
          font-size: 1.0625rem;
          font-weight: 300;
        }

        /* Numbers section */
        .about-numbers-section {
          position: relative;
          padding: 40px 0;
        }

        .about-numbers-section::before {
          content: '';
          position: absolute;
          top: -20px; left: 50%;
          transform: translateX(-50%);
          width: 600px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .about-numbers-section::after {
          content: '';
          position: absolute;
          bottom: -40px; right: -60px;
          width: 350px; height: 350px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26,95,122,0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .about-numbers-label {
          display: inline-block;
          font-family: var(--font-body);
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--teal-mid);
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 0.875rem;
          padding: 0.35rem 1rem;
          background: rgba(56,189,248,0.08);
          border-radius: 2px;
          border: 1px solid rgba(56,189,248,0.18);
          position: relative;
          z-index: 1;
        }

        .about-numbers-heading {
          font-family: var(--font-display);
          font-size: clamp(1.8rem, 3.5vw, 2.6rem);
          font-weight: 800;
          color: var(--ink);
          letter-spacing: -0.03em;
          line-height: 1.2;
          position: relative;
          z-index: 1;
        }

        /* Diamond/staggered grid */
        .about-numbers-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr 1fr;
          grid-template-rows: auto auto;
          gap: 20px;
          max-width: 840px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
          overflow: visible;
        }

        /* ── Section-level background blob (sits behind the whole numbers grid) ── */
        .numbers-section-bg-blob {
          position: absolute;
          pointer-events: none;
          border-radius: 44% 56% 60% 40% / 52% 44% 56% 48%;
          filter: blur(52px);
          animation: sectionBlobDrift 18s ease-in-out infinite alternate;
          z-index: 0;
        }

        .numbers-section-bg-blob-1 {
          width: 420px; height: 340px;
          background: radial-gradient(ellipse, rgba(56,189,248,0.13) 0%, rgba(26,95,122,0.06) 60%, transparent 100%);
          top: -60px; left: -80px;
          border-radius: 60% 40% 50% 50% / 48% 56% 44% 52%;
        }

        .numbers-section-bg-blob-2 {
          width: 360px; height: 300px;
          background: radial-gradient(ellipse, rgba(125,211,252,0.10) 0%, rgba(56,189,248,0.05) 60%, transparent 100%);
          bottom: -60px; right: -60px;
          border-radius: 50% 50% 38% 62% / 56% 44% 56% 44%;
          animation-delay: -6s;
        }

        .numbers-section-bg-blob-3 {
          width: 280px; height: 240px;
          background: radial-gradient(ellipse, rgba(42,143,168,0.09) 0%, rgba(13,45,58,0.04) 60%, transparent 100%);
          top: 40%; left: 38%;
          border-radius: 42% 58% 54% 46% / 50% 48% 52% 50%;
          animation-delay: -10s;
        }

        @keyframes sectionBlobDrift {
          0%   { transform: translate(0,0) scale(1) rotate(0deg); }
          33%  { transform: translate(20px,-15px) scale(1.05) rotate(3deg); }
          66%  { transform: translate(-12px,20px) scale(0.97) rotate(-2deg); }
          100% { transform: translate(10px,8px) scale(1.03) rotate(1deg); }
        }

        .about-number-card {
          background: var(--surface);
          border-radius: var(--radius-md);
          padding: 32px 24px;
          text-align: center;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          transition: all 0.45s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        /* Large organic blob INSIDE each number card — bottom-right quadrant */
        .about-number-card .card-bg-blob-tl {
          position: absolute;
          bottom: -45px; right: -45px;
          width: 160px; height: 130px;
          pointer-events: none;
          opacity: 0.13;
          border-radius: 60% 40% 52% 48% / 48% 56% 44% 52%;
          filter: blur(18px);
          animation: cardInnerBlobMorph 12s ease-in-out infinite alternate;
          transition: opacity 0.45s ease;
          z-index: 0;
        }

        .about-number-card:hover .card-bg-blob-tl { opacity: 0.22; }

        /* Smaller secondary blob — top-left corner */
        .about-number-card .card-bg-blob-br {
          position: absolute;
          top: -30px; left: -30px;
          width: 100px; height: 85px;
          pointer-events: none;
          opacity: 0.08;
          border-radius: 44% 56% 40% 60% / 56% 44% 56% 44%;
          filter: blur(14px);
          animation: cardInnerBlobMorph 15s ease-in-out infinite alternate-reverse;
          z-index: 0;
        }

        .about-number-card:hover .card-bg-blob-br { opacity: 0.15; }

        /* Per-card blob colors */
        .about-number-card-left .card-bg-blob-tl  { background: linear-gradient(135deg, #38bdf8, #0ea5e9); }
        .about-number-card-left .card-bg-blob-br  { background: linear-gradient(135deg, #7dd3fc, #38bdf8); animation-delay: -4s; }

        .about-number-card-top-center .card-bg-blob-tl { background: linear-gradient(135deg, #2dd4bf, #0d9488); animation-delay: -5s; }
        .about-number-card-top-center .card-bg-blob-br { background: linear-gradient(135deg, #5eead4, #2dd4bf); animation-delay: -2s; }

        .about-number-card-bottom-center .card-bg-blob-tl { background: linear-gradient(135deg, #fb923c, #ea580c); animation-delay: -8s; }
        .about-number-card-bottom-center .card-bg-blob-br { background: linear-gradient(135deg, #fdba74, #fb923c); animation-delay: -3s; }

        .about-number-card-right .card-bg-blob-tl { background: linear-gradient(135deg, #7dd3fc, #38bdf8); animation-delay: -11s; }
        .about-number-card-right .card-bg-blob-br { background: linear-gradient(135deg, #bae6fd, #7dd3fc); animation-delay: -7s; }

        @keyframes cardInnerBlobMorph {
          0%   { border-radius: 60% 40% 52% 48% / 48% 56% 44% 52%; transform: scale(1) rotate(0deg); }
          25%  { border-radius: 44% 56% 60% 40% / 56% 44% 52% 48%; transform: scale(1.06) rotate(4deg); }
          50%  { border-radius: 52% 48% 44% 56% / 44% 56% 48% 52%; transform: scale(0.97) rotate(-3deg); }
          75%  { border-radius: 48% 52% 56% 44% / 52% 48% 56% 44%; transform: scale(1.03) rotate(2deg); }
          100% { border-radius: 56% 44% 48% 52% / 48% 52% 44% 56%; transform: scale(1) rotate(0deg); }
        }

        @keyframes cardBlobDrift {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(8px, -8px) scale(1.06); }
          100% { transform: translate(-6px, 10px) scale(0.96); }
        }

        .about-number-card::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: var(--grad-teal);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
          z-index: 1;
        }

        .about-number-card:hover::after { transform: scaleX(1); }

        .about-number-card:hover {
          transform: translateY(-6px);
          box-shadow: var(--shadow-md);
          border-color: var(--border-teal);
        }

        .about-number-card-tall {
          grid-row: 1 / 3;
          align-self: center;
          padding: 44px 28px;
        }

        .about-number-card-left { grid-column: 1; }
        .about-number-card-top-center { grid-column: 2; grid-row: 1; }
        .about-number-card-bottom-center { grid-column: 2; grid-row: 2; }
        .about-number-card-right { grid-column: 3; }

        /* Blob shapes */
        .about-number-blob {
          width: 100px; height: 80px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          filter: drop-shadow(0 8px 20px rgba(0,0,0,0.1));
        }

        .about-number-blob::before {
          content: '';
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          opacity: 0.1;
          z-index: 0;
        }

        .about-number-blob-blue {
          background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
          border-radius: 60% 40% 45% 55% / 55% 45% 55% 45%;
          animation: blobMorph 8s ease-in-out infinite;
        }

        .about-number-blob-blue::before { background: #0ea5e9; }

        .about-number-blob-teal {
          background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%);
          border-radius: 45% 55% 50% 50% / 50% 45% 55% 50%;
          animation: blobMorph 9s ease-in-out infinite reverse;
        }

        .about-number-blob-teal::before { background: #0d9488; }

        .about-number-blob-coral {
          background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
          border-radius: 50% 50% 45% 55% / 55% 45% 55% 45%;
          animation: blobMorph 7.5s ease-in-out infinite;
        }

        .about-number-blob-coral::before { background: #ea580c; }

        .about-number-blob-yellow {
          background: linear-gradient(135deg, #7dd3fc 0%, #38bdf8 100%);
          border-radius: 55% 45% 50% 50% / 50% 55% 45% 50%;
          animation: blobMorph 8.5s ease-in-out infinite reverse;
        }

        .about-number-blob-yellow::before { background: #38bdf8; }

        @keyframes blobMorph {
          0%, 100% { border-radius: 60% 40% 45% 55% / 55% 45% 55% 45%; }
          25% { border-radius: 45% 55% 55% 45% / 50% 55% 45% 50%; }
          50% { border-radius: 55% 45% 45% 55% / 45% 55% 55% 45%; }
          75% { border-radius: 50% 50% 50% 50% / 55% 45% 50% 50%; }
        }

        .about-number-value {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 700;
          color: white;
          position: relative;
          z-index: 2;
          letter-spacing: -0.02em;
        }

        .about-number-title {
          font-family: var(--font-body);
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 8px;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }

        .about-number-desc {
          font-family: var(--font-body);
          font-size: 0.8125rem;
          color: var(--ink-50);
          line-height: 1.65;
          margin: 0;
          font-weight: 300;
        }

        /* What NOVAA Offers */
        .about-offers-section {
          position: relative;
          padding: 40px 0;
        }

        .about-offers-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          max-width: 720px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .about-offer-card {
          background: var(--surface);
          border-radius: var(--radius-md);
          padding: 36px 28px;
          text-align: center;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          transition: all 0.45s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        /* ── Section-level background blob behind the offers grid ── */
        .offers-section-bg-blob {
          position: absolute;
          pointer-events: none;
          filter: blur(48px);
          z-index: 0;
          animation: sectionBlobDrift 20s ease-in-out infinite alternate;
        }

        .offers-section-bg-blob-1 {
          width: 380px; height: 300px;
          background: radial-gradient(ellipse, rgba(56,189,248,0.10) 0%, rgba(125,211,252,0.05) 60%, transparent 100%);
          top: -40px; right: -60px;
          border-radius: 56% 44% 48% 52% / 44% 56% 44% 56%;
        }

        .offers-section-bg-blob-2 {
          width: 320px; height: 260px;
          background: radial-gradient(ellipse, rgba(42,143,168,0.08) 0%, rgba(56,189,248,0.04) 60%, transparent 100%);
          bottom: -40px; left: -50px;
          border-radius: 44% 56% 60% 40% / 52% 48% 52% 48%;
          animation-delay: -8s;
        }

        .about-offer-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--grad-teal);
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 0.4s ease;
          z-index: 2;
        }

        .about-offer-card:hover::before { transform: scaleX(1); }

        /* Large organic blob inside offer card — bottom-right */
        .about-offer-card .offer-bg-blob-tl {
          position: absolute;
          bottom: -40px; right: -40px;
          width: 140px; height: 115px;
          pointer-events: none;
          opacity: 0.12;
          border-radius: 56% 44% 52% 48% / 48% 56% 44% 52%;
          filter: blur(16px);
          animation: cardInnerBlobMorph 13s ease-in-out infinite alternate;
          transition: opacity 0.45s ease;
          z-index: 0;
        }

        .about-offer-card:hover .offer-bg-blob-tl { opacity: 0.2; }

        /* Smaller blob — top-left corner */
        .about-offer-card .offer-bg-blob-br {
          position: absolute;
          top: -28px; left: -28px;
          width: 90px; height: 75px;
          pointer-events: none;
          opacity: 0.07;
          border-radius: 44% 56% 40% 60% / 56% 44% 56% 44%;
          filter: blur(12px);
          animation: cardInnerBlobMorph 16s ease-in-out infinite alternate-reverse;
          z-index: 0;
        }

        .about-offer-card:hover .offer-bg-blob-br { opacity: 0.13; }

        /* Per-card blob colours via nth-child */
        .about-offer-card:nth-child(1) .offer-bg-blob-tl { background: linear-gradient(135deg, #38bdf8, #0ea5e9); }
        .about-offer-card:nth-child(1) .offer-bg-blob-br { background: linear-gradient(135deg, #7dd3fc, #38bdf8); animation-delay: -4s; }

        .about-offer-card:nth-child(2) .offer-bg-blob-tl { background: linear-gradient(135deg, #2dd4bf, #0d9488); animation-delay: -5s; }
        .about-offer-card:nth-child(2) .offer-bg-blob-br { background: linear-gradient(135deg, #5eead4, #2dd4bf); animation-delay: -2s; }

        .about-offer-card:nth-child(3) .offer-bg-blob-tl { background: linear-gradient(135deg, #fb923c, #ea580c); animation-delay: -8s; }
        .about-offer-card:nth-child(3) .offer-bg-blob-br { background: linear-gradient(135deg, #fdba74, #fb923c); animation-delay: -3s; }

        .about-offer-card:nth-child(4) .offer-bg-blob-tl { background: linear-gradient(135deg, #7dd3fc, #38bdf8); animation-delay: -11s; }
        .about-offer-card:nth-child(4) .offer-bg-blob-br { background: linear-gradient(135deg, #bae6fd, #7dd3fc); animation-delay: -7s; }

        .about-offer-card:hover {
          transform: translateY(-6px);
          box-shadow: var(--shadow-md);
          border-color: rgba(56,189,248,0.15);
        }

        .about-offer-blob {
          width: 72px; height: 60px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          filter: drop-shadow(0 6px 14px rgba(0,0,0,0.08));
        }

        .about-offer-blob::before {
          content: '';
          position: absolute;
          inset: -16px;
          border-radius: 50%;
          opacity: 0.1;
          z-index: 0;
        }

        .about-offer-blob i {
          font-size: 1.25rem;
          color: white;
          position: relative;
          z-index: 2;
        }

        .about-offer-blob-blue {
          background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
          border-radius: 60% 40% 45% 55% / 55% 45% 55% 45%;
          animation: blobMorph 8s ease-in-out infinite;
        }
        .about-offer-blob-blue::before { background: #0ea5e9; }

        .about-offer-blob-teal {
          background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%);
          border-radius: 45% 55% 50% 50% / 50% 45% 55% 50%;
          animation: blobMorph 9s ease-in-out infinite reverse;
        }
        .about-offer-blob-teal::before { background: #0d9488; }

        .about-offer-blob-coral {
          background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
          border-radius: 50% 50% 45% 55% / 55% 45% 55% 45%;
          animation: blobMorph 7.5s ease-in-out infinite;
        }
        .about-offer-blob-coral::before { background: #ea580c; }

        .about-offer-blob-yellow {
          background: linear-gradient(135deg, #7dd3fc 0%, #38bdf8 100%);
          border-radius: 55% 45% 50% 50% / 50% 55% 45% 50%;
          animation: blobMorph 8.5s ease-in-out infinite reverse;
        }
        .about-offer-blob-yellow::before { background: #38bdf8; }

        .about-offer-title {
          font-family: var(--font-body);
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 8px;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }

        .about-offer-desc {
          font-family: var(--font-body);
          font-size: 0.8125rem;
          color: var(--ink-50);
          line-height: 1.65;
          margin: 0;
          font-weight: 300;
        }

        /* ─── FEATURES SECTION ─── */
        .features-section-bg {
          background: linear-gradient(180deg, #eef6f9 0%, var(--paper) 100%);
          position: relative;
        }

        .features-section-bg::before,
        .features-section-bg::after {
          content: '';
          position: absolute;
          left: 0; right: 0;
          height: 1px;
        }

        .features-section-bg::before {
          top: 0;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.18), transparent);
        }

        .features-section-bg::after {
          bottom: 0;
          background: linear-gradient(90deg, transparent, var(--border), transparent);
        }

        .feature-card-landing {
          background: var(--surface);
          border-radius: var(--radius-md);
          overflow: hidden;
          height: 100%;
          border: 1px solid var(--border);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-sm);
          position: relative;
        }

        .feature-card-landing::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--grad-teal);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1;
        }

        .feature-card-landing:hover::before { transform: scaleX(1); }

        .feature-card-landing:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-lg);
          border-color: rgba(56,189,248,0.15);
        }

        .feature-img-wrapper {
          height: 200px;
          overflow: hidden;
          position: relative;
        }

        /* Overlay on feature images */
        .feature-img-wrapper::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 50%, rgba(10,31,43,0.08) 100%);
          pointer-events: none;
        }

        .feature-img-wrapper img {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .feature-card-landing:hover .feature-img-wrapper img { transform: scale(1.06); }

        .feature-icon {
          color: var(--teal-vivid);
          font-size: 1rem;
          margin-right: 0.5rem;
        }

        .feature-card-title {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: -0.01em;
        }

        .feature-card-desc {
          font-family: var(--font-body);
          color: var(--ink-50);
          font-size: 0.875rem;
          line-height: 1.75;
          font-weight: 300;
        }

        /* ─── CTA SECTION ─── */
        .cta-section-landing {
          background: var(--grad-hero);
          position: relative;
          overflow: hidden;
          padding: 110px 0;
        }

        .cta-section-landing::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 28% 50%, rgba(56,189,248,0.14) 0%, transparent 48%),
            radial-gradient(circle at 72% 50%, rgba(125,211,252,0.08) 0%, transparent 45%);
          pointer-events: none;
          animation: ctaGlow 7s ease-in-out infinite alternate;
        }

        .cta-section-landing::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.3), transparent);
        }

        @keyframes ctaGlow {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        /* Grid dots on CTA */
        .cta-grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        .cta-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(56,189,248,0.12);
          backdrop-filter: blur(12px);
          color: var(--teal-vivid);
          padding: 0.45rem 1.4rem;
          border-radius: 2px;
          font-weight: 600;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 2rem;
          border: 1px solid rgba(56,189,248,0.25);
          font-family: var(--font-body);
        }

        .cta-features-list {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2.5rem;
          flex-wrap: wrap;
        }

        .cta-feature-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          color: rgba(255,255,255,0.80);
          font-weight: 400;
          font-size: 0.875rem;
          font-family: var(--font-body);
          letter-spacing: 0.02em;
          transition: all 0.3s ease;
        }

        .cta-feature-item:hover { color: white; transform: translateY(-1px); }

        .cta-feature-item i {
          color: var(--teal-vivid);
          font-size: 0.875rem;
        }

        /* ─── CONTACT SECTION ─── */
        .contact-section-bg {
          background: var(--paper);
          position: relative;
        }

        .contact-section-bg::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border), transparent);
        }

        .contact-card {
          background: var(--surface);
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-md);
          transition: all 0.45s ease;
          position: relative;
        }

        .contact-card::before {
          content: '';
          position: absolute;
          top: 0; left: 64px; right: 64px;
          height: 2px;
          background: var(--grad-teal);
          opacity: 0.7;
        }

        .contact-card:hover {
          box-shadow: var(--shadow-lg);
          border-color: rgba(56,189,248,0.12);
        }

        .contact-card-inner { padding: 56px; }

        .contact-headline {
          font-family: var(--font-display);
          font-weight: 700;
          color: var(--ink);
          font-size: 1.75rem;
          letter-spacing: -0.025em;
        }

        .contact-subtext {
          font-family: var(--font-body);
          color: var(--ink-50);
          font-weight: 300;
          font-size: 0.9375rem;
        }

        .form-label-landing {
          font-family: var(--font-body);
          font-weight: 500;
          font-size: 0.8125rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--ink);
          margin-bottom: 0.5rem;
          display: block;
        }

        .form-control-landing,
        .form-select-landing {
          font-family: var(--font-body);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.8rem 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 0.9375rem;
          background: var(--surface-warm);
          color: var(--ink);
          font-weight: 300;
        }

        .form-control-landing:focus,
        .form-select-landing:focus {
          border-color: var(--teal-vivid);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.12);
          outline: none;
          background: white;
        }

        .form-control-landing:hover,
        .form-select-landing:hover { border-color: rgba(56,189,248,0.35); }

        .form-control-landing::placeholder { color: var(--ink-20); }

        .btn-contact-submit {
          font-family: var(--font-body);
          font-weight: 600;
          font-size: 0.875rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 1rem 3rem;
          border-radius: 3px;
          border: none;
          background: var(--grad-ink);
          color: white;
          transition: all 0.4s ease;
          position: relative;
          overflow: hidden;
        }

        .btn-contact-submit::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.18), transparent);
          transition: left 0.5s ease;
        }

        .btn-contact-submit:hover::before { left: 100%; }

        .btn-contact-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(10,31,43,0.3);
          color: white;
        }

        /* ─── FOOTER ─── */
        .footer-landing {
          background: #0a1f2b;
          padding: 30px 0 0px;
          position: relative;
        }

        .footer-landing::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.35), transparent);
        }

        .footer-brand-text {
          font-family: var(--font-display);
          font-weight: 700;
          color: white;
          font-size: 1.4rem;
          letter-spacing: -0.02em;
        }

        .footer-body-text {
          font-family: var(--font-body);
          color: rgba(255,255,255,0.75);
          line-height: 1.8;
          font-weight: 300;
          font-size: 0.9rem;
        }

        .footer-divider {
          border-color: rgba(255,255,255,0.07);
          margin: 36px 0;
        }

        .footer-copy {
          font-family: var(--font-body);
          color: rgba(255,255,255,0.65);
          font-size: 0.8rem;
          letter-spacing: 0.02em;
        }

        .version-badge {
          display: inline-block;
          background: rgba(56,189,248,0.18);
          color: var(--teal-vivid);
          padding: 0.15rem 0.55rem;
          border-radius: 2px;
          font-size: 0.7rem;
          font-weight: 600;
          margin-left: 0.5rem;
          border: 1px solid rgba(56,189,248,0.25);
          letter-spacing: 0.05em;
        }

        /* ─── FLOATING BACK TO TOP ─── */
        .floating-top {
          position: fixed;
          bottom: 32px; right: 32px;
          width: 48px; height: 48px;
          background: var(--ink);
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--teal-vivid);
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(10,31,43,0.3);
          z-index: 9999;
          border: 1px solid rgba(56,189,248,0.22);
        }

        .floating-top:hover {
          transform: translateY(-4px);
          background: #0d2d3a;
          box-shadow: 0 10px 32px rgba(10,31,43,0.4);
          border-color: rgba(56,189,248,0.45);
        }

        /* ─── LIGHTBOX ─── */
        .image-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10,31,43,0.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          z-index: 10002;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          cursor: zoom-out;
        }

        .image-modal-content {
          position: relative;
          max-width: 90vw; max-height: 90vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .image-modal-content img {
          max-width: 100%; max-height: 80vh;
          object-fit: contain;
          border-radius: var(--radius-md);
          box-shadow: 0 25px 80px rgba(0,0,0,0.6);
          cursor: default;
          border: 1px solid rgba(56,189,248,0.12);
        }

        .image-modal-title {
          color: rgba(255,255,255,0.80);
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 600;
          text-align: center;
          letter-spacing: 0.01em;
        }

        .image-modal-close {
          position: absolute;
          top: -52px; right: 0;
          width: 44px; height: 44px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(56,189,248,0.22);
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--teal-vivid);
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .image-modal-close:hover {
          background: rgba(255,255,255,0.12);
          transform: scale(1.05);
        }

        .feature-image-clickable { cursor: zoom-in; }
        .feature-image-clickable:hover img { opacity: 0.92; }

        /* ─── RESPONSIVE ─── */
        .container {
          width: 100%;
          padding-right: 15px;
          padding-left: 15px;
          margin-right: auto;
          margin-left: auto;
        }

        @media (min-width: 576px) { .container { max-width: 540px; } }
        @media (min-width: 768px) { .container { max-width: 720px; } }
        @media (min-width: 992px) { .container { max-width: 960px; } }
        @media (min-width: 1200px) { .container { max-width: 1140px; } }
        @media (min-width: 1400px) { .container { max-width: 1320px; } }

        @media (max-width: 1199.98px) {
          .hero-title-landing { font-size: clamp(2.5rem, 5.5vw, 4.5rem); }
          .about-card { max-width: 700px; padding: 48px 52px; }
          .about-numbers-grid { max-width: 720px; }
          .contact-card-inner { padding: 48px; }
        }

        @media (max-width: 991.98px) {
          .hero-section-landing { padding: 120px 0 100px; min-height: 90vh; }
          .hero-title-landing { font-size: clamp(2.2rem, 6vw, 3.8rem); }
          .hero-subtitle { font-size: clamp(0.95rem, 2vw, 1.1rem); max-width: 580px; }
          .section-landing { padding: 80px 0; }
          .section-heading, .section-heading-light { font-size: clamp(1.9rem, 4vw, 2.8rem); }
          .section-subheading, .section-subheading-light { font-size: 1rem; max-width: 540px; }

          .navbar-collapse {
            background: rgba(10,31,43,0.99);
            backdrop-filter: blur(24px);
            border-radius: var(--radius-md);
            padding: 1.25rem;
            margin-top: 0.75rem;
            box-shadow: var(--shadow-lg);
            border: 1px solid rgba(56,189,248,0.1);
          }

          .nav-link-landing { padding: 0.75rem 1rem !important; margin: 0.2rem 0; text-align: center !important; }
          .btn-nav-login { width: 100%; text-align: center; margin-top: 0.5rem; }

          .about-card { max-width: 100%; padding: 40px 36px; }
          .about-card-headline { font-size: 1.45rem; }
          .about-card-text { font-size: 1rem; }

          .about-numbers-section { padding: 30px 0; }
          .about-numbers-label { font-size: 0.65rem; }
          .about-numbers-heading { font-size: clamp(1.6rem, 3vw, 2.2rem); }
          .about-numbers-grid { max-width: 600px; gap: 16px; }

          .about-offers-grid { max-width: 600px; gap: 16px; }
          .about-offer-card { padding: 32px 24px; }

          .feature-img-wrapper { height: 180px; }

          .contact-card-inner { padding: 44px 36px; }
          .contact-headline { font-size: 1.55rem; }

          .footer-landing { padding: 24px 0 0px; }
        }

        @media (max-width: 767.98px) {
          html, body { overflow-x: hidden; width: 100%; }
          .container { padding-right: 12px; padding-left: 12px; }

          .hero-section-landing {
            padding: 100px 0 60px;
            min-height: 100vh;
            min-height: 100dvh;
            background-attachment: scroll;
            display: flex;
            align-items: center;
            width: 100%;
          }

          .hero-title-landing { font-size: clamp(1.75rem, 6vw, 2.5rem); margin-bottom: 1rem; padding-top: 5px; line-height: 1.15; }
          .hero-subtitle { font-size: clamp(0.85rem, 3vw, 0.95rem); margin-bottom: 1.75rem; line-height: 1.6; max-width: 100%; }
          .hero-badge { font-size: 0.65rem; padding: 0.35rem 0.875rem; margin-bottom: 1.25rem; }
          .hero-rule { margin-bottom: 1.75rem; }
          .hero-rule-line { width: 32px; }

          .section-landing { padding: 50px 0; width: 100%; }
          .section-heading, .section-heading-light { font-size: clamp(1.6rem, 6vw, 2.2rem); margin-bottom: 0.625rem; }
          .section-subheading, .section-subheading-light { font-size: 0.875rem; margin-top: 1rem; }
          .heading-underline::before { width: 50px; }
          .heading-underline::after { width: 20px; }

          .about-card { padding: 28px 20px; margin: 0; width: 100%; }
          .about-card::before { left: 24px; right: 24px; }
          .about-card-headline { font-size: 1.2rem; margin-bottom: 0.875rem; line-height: 1.35; }
          .about-card-text { font-size: 0.875rem; line-height: 1.7; }

          .about-numbers-section { padding: 20px 0; width: 100%; }
          .about-numbers-label { font-size: 0.6rem; margin-bottom: 0.625rem; padding: 0.25rem 0.75rem; }
          .about-numbers-heading { font-size: clamp(1.3rem, 5.5vw, 1.75rem); margin-bottom: 20px; }
          .about-numbers-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto auto;
            gap: 12px;
            max-width: 100%;
            margin: 0;
            width: 100%;
          }

          .about-number-card-tall { grid-row: auto; padding: 20px 14px; }
          .about-number-card-left { grid-column: 1; grid-row: 1; }
          .about-number-card-top-center { grid-column: 2; grid-row: 1; }
          .about-number-card-bottom-center { grid-column: 1; grid-row: 2; }
          .about-number-card-right { grid-column: 2; grid-row: 2; }

          .about-number-blob { width: 56px; height: 46px; margin-bottom: 10px; }
          .about-number-value { font-size: 0.9375rem; }
          .about-number-title { font-size: 0.75rem; margin-bottom: 4px; }
          .about-number-desc { font-size: 0.6875rem; line-height: 1.5; }

          .about-offers-section { padding: 20px 0; width: 100%; }
          .about-offers-grid {
            grid-template-columns: 1fr;
            max-width: 100%;
            margin: 0;
            gap: 12px;
            width: 100%;
          }

          .about-offer-card { padding: 24px 18px; width: 100%; }
          .about-offer-blob { width: 52px; height: 44px; margin-bottom: 14px; }
          .about-offer-blob i { font-size: 1rem; }
          .about-offer-title { font-size: 0.8125rem; }
          .about-offer-desc { font-size: 0.6875rem; line-height: 1.55; }

          .features-section-bg { width: 100%; }
          .feature-img-wrapper { height: 150px; }
          .feature-card-landing:hover { transform: translateY(-4px); }
          .p-4 { padding: 1rem !important; }

          .cta-section-landing { padding: 60px 0; width: 100%; }
          .cta-badge { font-size: 0.6rem; padding: 0.35rem 1rem; margin-bottom: 1.25rem; }
          .cta-features-list { flex-direction: column; gap: 0.75rem; align-items: center; }
          .cta-feature-item { font-size: 0.75rem; }

          .btn-hero-primary, .btn-hero-secondary {
            width: 100%;
            max-width: 100%;
            padding: 0.875rem 1.5rem;
            font-size: 0.75rem;
          }

          .contact-card { margin: 0; width: 100%; }
          .contact-card::before { left: 24px; right: 24px; }
          .contact-card-inner { padding: 28px 16px; width: 100%; }
          .contact-headline { font-size: 1.2rem; margin-bottom: 0.375rem; }
          .contact-subtext { font-size: 0.8125rem; margin-bottom: 24px; }

          .form-label-landing { font-size: 0.6875rem; }
          .form-control-landing, .form-select-landing { padding: 0.625rem 0.75rem; font-size: 0.8125rem; }
          .btn-contact-submit { padding: 0.8rem 2rem; font-size: 0.75rem; width: 100%; max-width: 100%; }

          .footer-landing { padding: 16px 0 0px; width: 100%; }
          .footer-brand-text { font-size: 1.1rem; }
          .footer-body-text { font-size: 0.8125rem; }
          .footer-copy { font-size: 0.6875rem; }

          .floating-top { bottom: 16px; right: 16px; width: 42px; height: 42px; font-size: 0.9375rem; }

          .image-modal-overlay { padding: 12px; }
          .image-modal-content img { max-height: 75vh; border-radius: var(--radius-sm); }
          .image-modal-title { font-size: 0.875rem; }
          .image-modal-close { top: -40px; right: 0; width: 36px; height: 36px; }

          .g-4 { --bs-gutter-x: 1rem !important; --bs-gutter-y: 1rem !important; }
        }

        @media (max-width: 575.98px) {
          .container { padding-right: 10px; padding-left: 10px; }

          .hero-section-landing { padding: 90px 0 50px; min-height: 100vh; min-height: 100dvh; }
          .hero-title-landing { font-size: clamp(1.5rem, 7vw, 2.2rem); margin-bottom: 0.875rem; }
          .hero-subtitle { font-size: 0.8125rem; margin-bottom: 1.5rem; line-height: 1.55; }
          .hero-badge { font-size: 0.6rem; padding: 0.3rem 0.75rem; margin-bottom: 1rem; }
          .hero-badge i { font-size: 0.5rem; }
          .hero-rule { margin-bottom: 1.25rem; gap: 10px; }
          .hero-rule-line { width: 24px; }
          .hero-rule-dot { width: 3px; height: 3px; }

          .section-landing { padding: 40px 0; }
          .section-heading, .section-heading-light { font-size: clamp(1.4rem, 7vw, 1.85rem); margin-bottom: 0.5rem; }
          .section-subheading, .section-subheading-light { font-size: 0.8125rem; margin-top: 0.875rem; max-width: 100%; }
          .heading-underline::before { width: 40px; bottom: 5px; }
          .heading-underline::after { width: 16px; bottom: 2px; }
          .heading-underline { padding-bottom: 14px; }

          .section-corner-mark { width: 20px; height: 20px; }
          .section-corner-mark.tl { top: 16px; left: 16px; }
          .section-corner-mark.br { bottom: 16px; right: 16px; }

          .about-card { padding: 20px 14px; margin: 0; }
          .about-card::before { left: 16px; right: 16px; }
          .about-card-headline { font-size: 1.05rem; margin-bottom: 0.75rem; line-height: 1.3; }
          .about-card-text { font-size: 0.8125rem; line-height: 1.65; }

          .about-numbers-section { padding: 16px 0; }
          .about-numbers-label { font-size: 0.55rem; margin-bottom: 0.5rem; padding: 0.2rem 0.625rem; }
          .about-numbers-heading { font-size: clamp(1.15rem, 6.5vw, 1.5rem); margin-bottom: 16px; }
          .about-numbers-grid {
            grid-template-columns: 1fr;
            gap: 10px;
            max-width: 100%;
            margin: 0;
          }

          .about-number-card-tall { grid-row: auto; padding: 16px 12px; }
          .about-number-card-left,
          .about-number-card-top-center,
          .about-number-card-bottom-center,
          .about-number-card-right {
            grid-column: auto;
            grid-row: auto;
          }

          .about-number-card { padding: 16px 12px; }
          .about-number-blob { width: 48px; height: 40px; margin-bottom: 8px; }
          .about-number-value { font-size: 0.875rem; }
          .about-number-title { font-size: 0.6875rem; margin-bottom: 4px; }
          .about-number-desc { font-size: 0.625rem; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

          .about-offers-section { padding: 16px 0; }
          .about-offers-grid { max-width: 100%; gap: 10px; margin: 0; }

          .about-offer-card { padding: 20px 14px; }
          .about-offer-blob { width: 46px; height: 38px; margin-bottom: 12px; }
          .about-offer-blob i { font-size: 0.875rem; }
          .about-offer-title { font-size: 0.75rem; margin-bottom: 4px; }
          .about-offer-desc { font-size: 0.625rem; line-height: 1.5; }

          .feature-img-wrapper { height: 130px; }
          .feature-card-title { font-size: 0.875rem; }
          .feature-card-desc { font-size: 0.75rem; line-height: 1.6; }
          .feature-icon { font-size: 0.8125rem; }
          .p-4 { padding: 0.75rem !important; }

          .cta-section-landing { padding: 50px 0; }
          .cta-badge { font-size: 0.55rem; padding: 0.3rem 0.875rem; margin-bottom: 1rem; }
          .cta-features-list { gap: 0.625rem; }
          .cta-feature-item { font-size: 0.6875rem; gap: 0.375rem; }
          .cta-feature-item i { font-size: 0.6875rem; }

          .btn-hero-primary, .btn-hero-secondary {
            max-width: 100%;
            padding: 0.75rem 1.25rem;
            font-size: 0.6875rem;
          }

          .contact-card { margin: 0; }
          .contact-card::before { left: 16px; right: 16px; }
          .contact-card-inner { padding: 20px 12px; }
          .contact-headline { font-size: 1.05rem; margin-bottom: 0.25rem; }
          .contact-subtext { font-size: 0.75rem; margin-bottom: 20px; }

          .form-label-landing { font-size: 0.625rem; margin-bottom: 0.3rem; }
          .form-control-landing, .form-select-landing { padding: 0.55rem 0.625rem; font-size: 0.75rem; border-radius: 6px; }
          .btn-contact-submit { padding: 0.7rem 1.5rem; font-size: 0.6875rem; max-width: 100%; }

          .footer-landing { padding: 12px 0 0px; }
          .footer-brand-text { font-size: 1rem; margin-bottom: 0.625rem; }
          .footer-body-text { font-size: 0.75rem; line-height: 1.65; }
          .footer-copy { font-size: 0.625rem; }
          .version-badge { font-size: 0.55rem; padding: 0.1rem 0.375rem; }

          .floating-top { bottom: 12px; right: 12px; width: 38px; height: 38px; font-size: 0.875rem; }

          .navbar-brand-landing { font-size: 1.25rem !important; }
          .navbar-brand-landing img { height: 32px; }

          .image-modal-overlay { padding: 8px; }
          .image-modal-content img { max-height: 70vh; border-radius: 6px; }
          .image-modal-title { font-size: 0.8125rem; }
          .image-modal-close { top: -36px; right: 0; width: 32px; height: 32px; font-size: 0.8125rem; }

          .g-4 { --bs-gutter-x: 0.75rem !important; --bs-gutter-y: 0.75rem !important; }
          .mb-5 { margin-bottom: 2rem !important; }
          .mt-5 { margin-top: 2rem !important; }
        }

        @media (max-width: 374.98px) {
          .container { padding-right: 8px; padding-left: 8px; }

          .hero-section-landing { padding: 80px 0 40px; min-height: 100vh; min-height: 100dvh; }
          .hero-title-landing { font-size: clamp(1.35rem, 8vw, 1.85rem); }
          .hero-subtitle { font-size: 0.75rem; margin-bottom: 1.25rem; }
          .hero-badge { font-size: 0.55rem; padding: 0.25rem 0.625rem; }

          .section-landing { padding: 32px 0; }
          .section-heading, .section-heading-light { font-size: clamp(1.25rem, 7.5vw, 1.6rem); }
          .section-subheading, .section-subheading-light { font-size: 0.75rem; }

          .about-card { padding: 16px 10px; }
          .about-card-headline { font-size: 0.9375rem; }
          .about-card-text { font-size: 0.75rem; }

          .about-numbers-heading { font-size: 1.05rem; }
          .about-numbers-grid { margin: 0; gap: 8px; }
          .about-number-card { padding: 14px 10px; }
          .about-number-blob { width: 42px; height: 36px; }
          .about-number-value { font-size: 0.8125rem; }
          .about-number-title { font-size: 0.625rem; }
          .about-number-desc { font-size: 0.5625rem; }

          .about-offers-grid { margin: 0; }
          .about-offer-card { padding: 16px 10px; }
          .about-offer-blob { width: 40px; height: 34px; }
          .about-offer-title { font-size: 0.6875rem; }
          .about-offer-desc { font-size: 0.5625rem; }

          .feature-img-wrapper { height: 110px; }
          .feature-card-title { font-size: 0.8125rem; }
          .feature-card-desc { font-size: 0.6875rem; }

          .cta-section-landing { padding: 40px 0; }
          .btn-hero-primary, .btn-hero-secondary { max-width: 100%; padding: 0.6875rem 1rem; font-size: 0.625rem; }

          .contact-card { margin: 0; }
          .contact-card-inner { padding: 16px 8px; }
          .contact-headline { font-size: 0.9375rem; }
          .contact-subtext { font-size: 0.6875rem; }

          .form-control-landing, .form-select-landing { padding: 0.5rem 0.5rem; font-size: 0.6875rem; }
          .btn-contact-submit { max-width: 100%; padding: 0.625rem 1.25rem; font-size: 0.625rem; }

          .footer-body-text { font-size: 0.6875rem; }
          .footer-copy { font-size: 0.5625rem; }

          .floating-top { bottom: 10px; right: 10px; width: 34px; height: 34px; }

          .mb-5 { margin-bottom: 1.5rem !important; }
          .mt-5 { margin-top: 1.5rem !important; }
          .g-4 { --bs-gutter-x: 0.5rem !important; --bs-gutter-y: 0.5rem !important; }
        }

        @media (max-width: 991.98px) and (orientation: landscape) {
          .hero-section-landing { padding: 70px 0 40px; min-height: auto; }
          .hero-title-landing { font-size: clamp(1.5rem, 4vw, 2.2rem); margin-bottom: 0.75rem; }
          .hero-subtitle { font-size: 0.8125rem; margin-bottom: 1.25rem; }
          .hero-badge { margin-bottom: 0.875rem; }

          .about-numbers-grid { grid-template-columns: repeat(4, 1fr); max-width: 100%; }
          .about-number-card-tall { grid-row: auto; }
          .about-number-card-left,
          .about-number-card-top-center,
          .about-number-card-bottom-center,
          .about-number-card-right {
            grid-column: auto;
            grid-row: auto;
          }

          .about-offers-grid { grid-template-columns: 1fr 1fr; max-width: 100%; }
        }

        @media (min-width: 1400px) {
          .hero-title-landing { font-size: 5.5rem; }
          .section-heading, .section-heading-light { font-size: 3.2rem; }
          .about-card { max-width: 900px; padding: 64px 72px; }
          .about-numbers-grid { max-width: 960px; }
          .about-offers-grid { max-width: 840px; }
          .contact-card-inner { padding: 64px; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          html { scroll-behavior: auto; }
        }

        @media print {
          .landing-navbar,
          .scroll-progress-bar,
          .floating-top,
          .image-modal-overlay,
          .hero-blob,
          .hero-grid-dots,
          .hero-lines,
          .hero-diagonal-accent,
          .section-corner-mark,
          .numbers-section-bg-blob,
          .offers-section-bg-blob,
          .cta-grid { display: none !important; }

          .hero-section-landing { background: white !important; color: black !important; min-height: auto; }
          .section-landing { padding: 40px 0 !important; }
        }
      `}</style>

      {/* Scroll Progress Bar */}
      <motion.div className="scroll-progress-bar" style={{ scaleX }} />

      {/* ─── NAVIGATION ─── */}
      <nav
        className={`landing-navbar navbar navbar-expand-lg navbar-dark ${scrollY > 50 ? "scrolled" : ""}`}
      >
        <Container>
          <a
            className="navbar-brand-landing"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <img src="/novaaa.png" alt="NOVAA Logo" />
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ borderColor: "rgba(56,189,248,0.35)" }}
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <Nav
              className="ms-auto align-items-center"
              style={{ gap: "0.25rem" }}
            >
              <Nav.Item>
                <Nav.Link
                  className={`nav-link-landing ${activeSection === "about" ? "active" : ""}`}
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("about");
                  }}
                >
                  About
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  className={`nav-link-landing ${activeSection === "features" ? "active" : ""}`}
                  href="#features"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("features");
                  }}
                >
                  Features
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  className={`nav-link-landing ${activeSection === "contact" ? "active" : ""}`}
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("contact");
                  }}
                >
                  Contact
                </Nav.Link>
              </Nav.Item>
              <Nav.Item className="ms-3">
                <Button className="btn-nav-login" href="/login">
                  <i className="fas fa-sign-in-alt me-2"></i>
                  <span>Login</span>
                </Button>
              </Nav.Item>
            </Nav>
          </div>
        </Container>
      </nav>

      {/* ─── HERO ─── */}
      <section className="hero-section-landing">
        <div className="hero-grid-dots" />
        <div className="hero-lines" />
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />
        <div className="hero-diagonal-accent" />

        <Container>
          <div className="hero-content text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="hero-badge">
                <i className="fas fa-sparkles"></i>
                <span>Next-Gen Education Platform</span>
              </div>
            </motion.div>

            {/* Title */}
            <div className="hero-animate-wrapper">
              <h1
                className="hero-title-landing mb-4"
                style={{ overflow: "hidden" }}
              >
                <span className="d-inline-block animate__animated animate__bounceInDown hero-bounce-in-down">
                  Transform Your
                </span>
                <br />
                <span className="d-inline-block animate__animated animate__bounceInRight hero-bounce-in-right">
                  Educational{" "}
                  <span className="hero-highlight">Institution</span>
                </span>
              </h1>
            </div>

            {/* Decorative rule */}
            <motion.div
              className="hero-rule"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.75 }}
            >
              <div className="hero-rule-line"></div>
              <div className="hero-rule-dot"></div>
              <div className="hero-rule-line rev"></div>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              className="hero-subtitle mb-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.8 }}
            >
              Comprehensive college management platform designed to streamline
              operations, enhance learning experiences, and connect students,
              teachers, and administrators seamlessly.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="d-flex gap-3 flex-wrap justify-content-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1 }}
            >
              <Button className="btn-hero-primary" href="/register">
                <i className="fas fa-rocket me-2"></i>Get Started
              </Button>
              <Button
                className="btn-hero-secondary"
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("features");
                }}
              >
                <i className="fas fa-info-circle me-2"></i>Learn More
              </Button>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* ─── ABOUT SECTION ─── */}
      <section id="about" className="section-landing about-section-bg">
        <div className="section-corner-mark tl" />
        <div className="section-corner-mark br" />

        <Container>
          {/* Section Heading */}
          <div className="text-center mb-5">
            <h2 className="section-heading heading-underline animate__animated animate__bounceIn">
              About NOVAA
            </h2>
            <motion.p
              className="section-subheading"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Transforming education through innovative technology solutions
            </motion.p>
          </div>

          {/* Main About Card */}
          <motion.div
            className="about-card text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h3 className="about-card-headline">
              Revolutionizing Educational Management
            </h3>
            <p className="about-card-text mb-0">
              NOVAA is a comprehensive education management platform designed to
              streamline operations across educational institutions. Our
              platform connects students, teachers, administrators, and parents
              through a unified digital ecosystem.
            </p>
          </motion.div>

          {/* Numbers Section */}
          <div className="about-numbers-section mt-5">
            <div className="text-center mb-5">
              <span className="about-numbers-label">TALKING ABOUT NUMBERS</span>
              <h3 className="about-numbers-heading">We Believe in Numbers</h3>
            </div>

            <div className="about-numbers-grid">
              <div
                className="numbers-section-bg-blob numbers-section-bg-blob-1"
                style={{ position: "absolute" }}
              />
              <div
                className="numbers-section-bg-blob numbers-section-bg-blob-2"
                style={{ position: "absolute" }}
              />
              <div
                className="numbers-section-bg-blob numbers-section-bg-blob-3"
                style={{ position: "absolute" }}
              />

              {/* Left — Students (tall) */}
              <motion.div
                className="about-number-card about-number-card-tall about-number-card-left"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <div className="card-bg-blob-tl" />
                <div className="card-bg-blob-br" />
                <div className="about-number-blob about-number-blob-blue">
                  <span className="about-number-value">
                    {statsLoading
                      ? "..."
                      : `${stats.totalStudents.toLocaleString()}+`}
                  </span>
                </div>
                <h5 className="about-number-title">Students Managed</h5>
                <p className="about-number-desc">
                  Complete student lifecycle managed through our platform.
                </p>
              </motion.div>

              {/* Top-center — Institutions */}
              <motion.div
                className="about-number-card about-number-card-top-center"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <div className="card-bg-blob-tl" />
                <div className="card-bg-blob-br" />
                <div className="about-number-blob about-number-blob-teal">
                  <span className="about-number-value">
                    {statsLoading ? "..." : `${stats.totalColleges}+`}
                  </span>
                </div>
                <h5 className="about-number-title">Institutions Trust NOVAA</h5>
                <p className="about-number-desc">
                  Leading institutions powered by our technology solutions.
                </p>
              </motion.div>

              {/* Bottom-center — Teachers */}
              <motion.div
                className="about-number-card about-number-card-bottom-center"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                <div className="card-bg-blob-tl" />
                <div className="card-bg-blob-br" />
                <div className="about-number-blob about-number-blob-coral">
                  <span className="about-number-value">
                    {statsLoading ? "..." : `${stats.totalTeachers}+`}
                  </span>
                </div>
                <h5 className="about-number-title">Teachers Empowered</h5>
                <p className="about-number-desc">
                  Educators streamlined with intelligent tools.
                </p>
              </motion.div>

              {/* Right — Uptime (tall) */}
              <motion.div
                className="about-number-card about-number-card-tall about-number-card-right"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
                <div className="card-bg-blob-tl" />
                <div className="card-bg-blob-br" />
                <div className="about-number-blob about-number-blob-yellow">
                  <span className="about-number-value">
                    {stats.systemUptime}
                  </span>
                </div>
                <h5 className="about-number-title">System Uptime</h5>
                <p className="about-number-desc">
                  Reliable, always-on infrastructure for your campus.
                </p>
              </motion.div>
            </div>
          </div>

          {/* What NOVAA Offers */}
          <div className="about-offers-section mt-5">
            <div className="text-center mb-5">
              <span className="about-numbers-label">WHY CHOOSE US</span>
              <h3 className="about-numbers-heading">What NOVAA Offers</h3>
            </div>

            <div className="about-offers-grid" style={{ position: "relative" }}>
              <div className="offers-section-bg-blob offers-section-bg-blob-1" />
              <div className="offers-section-bg-blob offers-section-bg-blob-2" />

              {[
                {
                  icon: "fa-shield-halved",
                  title: "Secure & Reliable",
                  desc: "Enterprise-grade security with role-based access control, data encryption, and automated backups.",
                  blobColor: "about-offer-blob-blue",
                },
                {
                  icon: "fa-mobile-screen-button",
                  title: "Mobile-First Design",
                  desc: "Access your college ERP anytime, anywhere with a fully responsive interface for all devices.",
                  blobColor: "about-offer-blob-teal",
                },
                {
                  icon: "fa-puzzle-piece",
                  title: "Modular & Scalable",
                  desc: "Start with what you need and expand as your institution grows to multi-campus universities.",
                  blobColor: "about-offer-blob-coral",
                },
                {
                  icon: "fa-headset",
                  title: "Dedicated Support",
                  desc: "Expert onboarding assistance, training, and 24/7 technical support for a smooth experience.",
                  blobColor: "about-offer-blob-yellow",
                },
              ].map((offer, i) => (
                <motion.div
                  className="about-offer-card"
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.1 * i }}
                >
                  <div className="offer-bg-blob-tl" />
                  <div className="offer-bg-blob-br" />
                  <div className={`about-offer-blob ${offer.blobColor}`}>
                    <i className={`fas ${offer.icon}`}></i>
                  </div>
                  <h5 className="about-offer-title">{offer.title}</h5>
                  <p className="about-offer-desc">{offer.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section id="features" className="section-landing features-section-bg">
        <Container>
          <motion.div
            className="text-center mb-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2
              className="section-heading heading-underline"
              variants={fadeInUp}
            >
              Powerful Features
            </motion.h2>
            <motion.p
              className="section-subheading"
              variants={fadeInUp}
              custom={1}
            >
              Everything you need to manage your educational institution
              efficiently
            </motion.p>
          </motion.div>

          <Row className="g-4">
            {features.map((feature, index) => (
              <Col xs={12} sm={6} lg={4} key={index}>
                <motion.div
                  className="feature-card-landing"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeInUp}
                  custom={index * 0.1}
                >
                  <div
                    className="feature-img-wrapper feature-image-clickable"
                    onClick={() =>
                      setSelectedImage({
                        src: feature.image,
                        title: feature.title,
                      })
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedImage({
                          src: feature.image,
                          title: feature.title,
                        });
                      }
                    }}
                    aria-label={`View ${feature.title} image`}
                  >
                    <img src={feature.image} alt={feature.title} />
                  </div>
                  <div className="p-4">
                    <h5 className="feature-card-title text-center mb-3">
                      <i className={`fas ${feature.icon} feature-icon`}></i>
                      {feature.title}
                    </h5>
                    <p className="feature-card-desc text-center">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="cta-section-landing">
        <div className="cta-grid" />
        <Container>
          <motion.div
            className="text-center"
            style={{ position: "relative", zIndex: 2 }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="cta-badge">
                <i className="fas fa-rocket"></i>
                <span>Limited Time Offer</span>
              </span>
            </motion.div>

            <motion.h2
              className="section-heading-light heading-underline"
              variants={fadeInUp}
              custom={1}
            >
              Ready to Transform Your Institution?
            </motion.h2>

            <motion.p
              className="section-subheading-light"
              variants={fadeInUp}
              custom={2}
            >
              Join hundreds of educational institutions that trust NOVAA for
              their management needs. Start your journey towards digital
              excellence today.
            </motion.p>

            <motion.div
              className="d-flex gap-3 flex-wrap justify-content-center mb-4"
              variants={fadeInUp}
              custom={3}
            >
              <Button
                className="btn-hero-primary"
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("contact");
                }}
              >
                <i className="fas fa-play-circle me-2"></i>Start Free Trial
              </Button>
              <Button
                className="btn-hero-secondary"
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("contact");
                }}
              >
                <i className="fas fa-calendar-alt me-2"></i>Schedule Demo
              </Button>
            </motion.div>

            <motion.div
              className="cta-features-list"
              variants={fadeInUp}
              custom={4}
            >
              <div className="cta-feature-item">
                <i className="fas fa-check-circle"></i>
                <span>14-Day Free Trial</span>
              </div>
              <div className="cta-feature-item">
                <i className="fas fa-check-circle"></i>
                <span>No Credit Card Required</span>
              </div>
              <div className="cta-feature-item">
                <i className="fas fa-check-circle"></i>
                <span>24/7 Support</span>
              </div>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {/* ─── CONTACT SECTION ─── */}
      <section id="contact" className="section-landing contact-section-bg">
        <Container>
          <motion.div
            className="text-center mb-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2
              className="section-heading heading-underline"
              variants={fadeInUp}
            >
              Get In Touch
            </motion.h2>
            <motion.p
              className="section-subheading"
              variants={fadeInUp}
              custom={1}
            >
              Have questions? Our team is here to help you get started
            </motion.p>
          </motion.div>

          <Row className="justify-content-center">
            <Col lg={8}>
              <motion.div
                className="contact-card"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
              >
                <div className="contact-card-inner">
                  <h3 className="contact-headline fw-bold mb-2 text-center">
                    <i
                      className="fas fa-paper-plane me-2"
                      style={{ color: "var(--teal-vivid)" }}
                    ></i>
                    Send Us a Message
                  </h3>
                  <p className="contact-subtext text-center mb-5">
                    Fill out the form below and we'll get back to you within 24
                    hours.
                  </p>

                  <Form id="contactForm">
                    <Row className="g-4">
                      <Col xs={12} md={6}>
                        <label className="form-label-landing">
                          First Name <span className="text-danger">*</span>
                        </label>
                        <Form.Control
                          type="text"
                          className="form-control-landing"
                          placeholder="John"
                          required
                          minLength={2}
                          pattern="[A-Za-z\s]+"
                        />
                      </Col>
                      <Col xs={12} md={6}>
                        <label className="form-label-landing">
                          Last Name <span className="text-danger">*</span>
                        </label>
                        <Form.Control
                          type="text"
                          className="form-control-landing"
                          placeholder="Doe"
                          required
                          minLength={2}
                          pattern="[A-Za-z\s]+"
                        />
                      </Col>
                      <Col xs={12} md={6}>
                        <label className="form-label-landing">
                          Email Address <span className="text-danger">*</span>
                        </label>
                        <Form.Control
                          type="email"
                          className="form-control-landing"
                          placeholder="john@example.com"
                          required
                        />
                      </Col>
                      <Col xs={12} md={6}>
                        <label className="form-label-landing">
                          Phone Number{" "}
                          <span
                            className="text-muted fw-normal"
                            style={{
                              textTransform: "none",
                              fontSize: "0.75rem",
                            }}
                          >
                            (Optional)
                          </span>
                        </label>
                        <Form.Control
                          type="tel"
                          className="form-control-landing"
                          placeholder="+1 (555) 000-0000"
                          pattern="[+]?[0-9\s()\-]+"
                          minLength={10}
                        />
                      </Col>
                      <Col xs={12}>
                        <label className="form-label-landing">
                          Institution/Organization{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <Form.Control
                          type="text"
                          className="form-control-landing"
                          placeholder="Your institution name"
                          required
                          minLength={3}
                        />
                      </Col>
                      <Col xs={12}>
                        <label className="form-label-landing">
                          Your Role <span className="text-danger">*</span>
                        </label>
                        <Form.Select className="form-select-landing" required>
                          <option value="" disabled>
                            Select your role
                          </option>
                          <option value="principal">Principal</option>
                          <option value="admin">Administrator</option>
                          <option value="teacher">Teacher</option>
                          <option value="student">Student</option>
                          <option value="parent">Parent</option>
                          <option value="other">Other</option>
                        </Form.Select>
                      </Col>
                      <Col xs={12}>
                        <label className="form-label-landing">
                          Your Message <span className="text-danger">*</span>
                        </label>
                        <Form.Control
                          as="textarea"
                          rows={5}
                          className="form-control-landing"
                          placeholder="Tell us how we can help you..."
                          required
                          minLength={10}
                        />
                      </Col>
                      <Col xs={12} className="text-center">
                        <Button
                          type="submit"
                          className="btn-contact-submit btn-lg px-5 py-3"
                        >
                          <i className="fas fa-paper-plane me-2"></i>
                          <span>Send Message</span>
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </div>
              </motion.div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="footer-landing">
        <Container>
          <Row className="align-items-center">
            <Col lg={4} className="mb-4 mb-lg-0">
              <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <img
                  src="/novaaa.png"
                  alt="NOVAA Logo"
                  style={{
                    height: "38px",
                    width: "auto",
                    filter: "brightness(0.9)",
                  }}
                />
              </h5>
              <p className="footer-body-text mb-0">
                Modern education management platform designed to streamline
                operations and enhance learning experiences for institutions
                worldwide.
              </p>
            </Col>
            <Col
              lg={8}
              className="d-flex align-items-end justify-content-lg-end"
            >
              <p className="footer-copy mb-0">
                &copy; 2026 NOVAA <span className="version-badge">v2.1.0</span>{" "}
                All rights reserved.
              </p>
            </Col>
          </Row>
          <hr
            className="footer-divider"
            style={{ marginTop: "36px", marginBottom: 0 }}
          />
        </Container>
      </footer>

      {/* ─── FLOATING BACK TO TOP ─── */}
      <motion.button
        className="floating-top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        title="Back to Top"
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={
          scrollY > window.innerHeight
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 20, scale: 0.9 }
        }
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        ↑
      </motion.button>

      {/* ─── IMAGE LIGHTBOX MODAL ─── */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="image-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setSelectedImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
          >
            <motion.div
              className="image-modal-content"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="image-modal-close"
                onClick={() => setSelectedImage(null)}
                aria-label="Close image preview"
              >
                ✕
              </button>
              <motion.img
                src={selectedImage.src}
                alt={selectedImage.title}
                layout
              />
              <span className="image-modal-title">{selectedImage.title}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}