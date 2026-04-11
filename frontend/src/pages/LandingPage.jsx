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
      // Ease out cubic
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
        // Axios interceptor transforms the response — data is already unwrapped
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
        // Fallback to defaults if API fails
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

      // Active section highlighting
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
        :root {
          --primary-darkest: #0a1f29;
          --primary-darker: #0f3a4a;
          --primary-dark: #134a5f;
          --primary-medium: #1a5c75;
          --primary-light: #2688a8;
          --primary-lighter: #3db5e6;
          --primary-lightest: #4fc3f7;
          --primary-glow: #6dd5fa;
          --gradient-accent: linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%);
          --gradient-primary: linear-gradient(135deg, #0f3a4a 0%, #3db5e6 100%);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        html { scroll-behavior: smooth; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow-x: hidden;
        }

        /* Scroll Progress */
        .scroll-progress-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient-accent);
          z-index: 10001;
          transform-origin: left;
          box-shadow: 0 0 10px rgba(61, 181, 230, 0.5);
        }

        /* Navbar */
        .landing-navbar {
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          background: rgba(1, 32, 43, 0.85) !important;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 1rem 0;
          border-bottom: 1px solid rgba(61, 181, 230, 0.08);
        }

        .landing-navbar.scrolled {
          background: rgba(1, 14, 20, 0.96) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          padding: 0.75rem 0;
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
        }

        .navbar-brand-landing {
          font-weight: 800;
          color: white !important;
          font-size: 1.75rem !important;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          letter-spacing: -0.02em;
          transition: transform 0.3s ease;
        }

        .navbar-brand-landing:hover {
          transform: scale(1.02);
        }

        .navbar-brand-landing img {
          height: 48px;
          width: auto;
          filter: drop-shadow(0 2px 10px rgba(61, 181, 230, 0.4));
        }

        .nav-link-landing {
          color: rgba(230, 242, 245, 0.9) !important;
          font-weight: 500;
          font-size: 0.9375rem;
          padding: 0.5rem 0.875rem !important;
          border-radius: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .nav-link-landing::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 60%;
          height: 2px;
          background: var(--gradient-accent);
          border-radius: 1px;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-link-landing:hover::after,
        .nav-link-landing.active::after {
          transform: translateX(-50%) scaleX(1);
        }

        .nav-link-landing:hover,
        .nav-link-landing.active {
          color: #4fc3f7 !important;
          background: rgba(61, 181, 230, 0.08);
        }

        .btn-nav-login {
          background: var(--gradient-accent) !important;
          color: white !important;
          font-weight: 600;
          padding: 0.625rem 1.5rem !important;
          border-radius: 50px;
          border: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(61, 181, 230, 0.3);
          font-size: 0.9375rem;
          position: relative;
          overflow: hidden;
        }

        .btn-nav-login::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .btn-nav-login:hover::before {
          left: 100%;
        }

        .btn-nav-login:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(61, 181, 230, 0.45);
        }

        /* Hero Section */
        .hero-section-landing {
          background: linear-gradient(135deg, rgba(10, 31, 41, 0.90) 0%, rgba(15, 58, 74, 0.86) 50%, rgba(26, 92, 117, 0.80) 100%),
                      url(${heroBgImg}) center center / cover no-repeat;
          background-attachment: fixed;
          color: white;
          padding: 0px 0 120px;
          position: relative;
          overflow: hidden;
          min-height: 100vh;
          display: flex;
          align-items: center;
        }

        /* Animated mesh gradient overlay */
        .hero-section-landing::before {
          content: '';
          position: absolute;
          inset: -50%;
          background-image:
            radial-gradient(circle at 20% 50%, rgba(61, 181, 230, 0.18) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(79, 195, 247, 0.14) 0%, transparent 40%),
            radial-gradient(circle at 40% 80%, rgba(109, 213, 250, 0.12) 0%, transparent 45%),
            radial-gradient(circle at 70% 60%, rgba(61, 181, 230, 0.10) 0%, transparent 35%);
          pointer-events: none;
          animation: heroMeshMove 15s ease-in-out infinite alternate;
        }

        @keyframes heroMeshMove {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          25% { transform: translate(2%, -1%) rotate(1deg) scale(1.02); }
          50% { transform: translate(-1%, 2%) rotate(-0.5deg) scale(0.98); }
          75% { transform: translate(1%, -2%) rotate(0.5deg) scale(1.01); }
          100% { transform: translate(-2%, 1%) rotate(-1deg) scale(1); }
        }

        /* Subtle grain texture overlay */
        .hero-section-landing::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.4;
          z-index: 1;
        }

        /* Animated grid dots */
        .hero-grid-dots {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(61, 181, 230, 0.08) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 1;
          animation: gridFade 3s ease-in-out infinite alternate;
        }

        @keyframes gridFade {
          0% { opacity: 0.3; }
          100% { opacity: 0.7; }
        }

        /* Animated horizontal lines */
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
          top: 20%;
          left: -100%;
          width: 200%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(61, 181, 230, 0.15), transparent);
          animation: heroLineScan 8s linear infinite;
        }

        .hero-lines::after {
          content: '';
          position: absolute;
          top: 60%;
          left: -100%;
          width: 200%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79, 195, 247, 0.1), transparent);
          animation: heroLineScan 12s linear infinite reverse;
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
          width: 600px;
          height: 600px;
          background: #3db5e6;
          top: -15%;
          right: -10%;
          animation: blobFloat1 20s ease-in-out infinite;
        }

        .hero-blob-2 {
          width: 500px;
          height: 500px;
          background: #4fc3f7;
          bottom: -15%;
          left: -10%;
          animation: blobFloat2 18s ease-in-out infinite;
        }

        .hero-blob-3 {
          width: 350px;
          height: 350px;
          background: #6dd5fa;
          top: 40%;
          left: 45%;
          animation: blobFloat3 22s ease-in-out infinite;
        }

        @keyframes blobFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -40px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.95); }
        }

        @keyframes blobFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 40px) scale(1.05); }
          66% { transform: translate(40px, -20px) scale(0.9); }
        }

        @keyframes blobFloat3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.15); }
        }

        /* Animate.css overrides — only apply on hero, not globally */
        .hero-animate-wrapper .animate__animated {
          --animate-duration: 1.2s;
        }

        .hero-bounce-in-down {
          --animate-duration: 1s;
        }

        .hero-bounce-in-right {
          --animate-duration: 1.2s;
        }

        .hero-content {
          position: relative;
          z-index: 3;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(61, 181, 230, 0.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #4fc3f7;
          padding: 0.5rem 1.25rem;
          border-radius: 50px;
          font-weight: 500;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(61, 181, 230, 0.2);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .hero-title-landing {
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          letter-spacing: -0.03em;
          padding-top: 15px;
        }

        .hero-highlight {
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 30px rgba(61, 181, 230, 0.4));
        }

        .hero-subtitle {
          font-size: clamp(1.0625rem, 2vw, 1.25rem);
          opacity: 0.9;
          margin-bottom: 2.5rem;
          line-height: 1.8;
          max-width: 720px;
          margin-left: auto;
          margin-right: auto;
          font-weight: 400;
        }

        .btn-hero-primary {
          background: var(--gradient-accent);
          color: white;
          font-weight: 600;
          padding: 1rem 2.25rem;
          border-radius: 50px;
          border: none;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 24px rgba(61, 181, 230, 0.35);
          font-size: 1rem;
          position: relative;
          overflow: hidden;
        }

        .btn-hero-primary::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s ease, height 0.6s ease;
        }

        .btn-hero-primary:hover::before {
          width: 300px;
          height: 300px;
        }

        .btn-hero-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(61, 181, 230, 0.5);
          background: linear-gradient(135deg, #4fc3f7 0%, #6dd5fa 100%);
          color: white;
        }

        .btn-hero-secondary {
          background: rgba(255, 255, 255, 0.06);
          color: white;
          font-weight: 600;
          padding: 1rem 2.25rem;
          border-radius: 50px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          font-size: 1rem;
        }

        .btn-hero-secondary:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          color: white;
        }

        /* Sections */
        .section-landing {
          padding: 96px 0;
          position: relative;
        }

        .section-heading {
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 800;
          color: #0a1f29;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .section-heading-light {
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 800;
          color: white;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .section-subheading {
          color: #64748b;
          font-size: 1.125rem;
          margin-top: 1.5rem;
          line-height: 1.7;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
          font-weight: 400;
        }

        .section-subheading-light {
          color: rgba(255, 255, 255, 0.85);
          font-size: 1.125rem;
          margin-top: 1.5rem;
          line-height: 1.7;
          max-width: 680px;
          margin-left: auto;
          margin-right: auto;
          font-weight: 400;
        }

        .heading-underline {
          position: relative;
          display: inline-block;
        }

        .heading-underline::after {
          content: '';
          position: absolute;
          bottom: -12px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 3px;
          background: var(--gradient-accent);
          border-radius: 2px;
          box-shadow: 0 0 12px rgba(61, 181, 230, 0.4);
        }

        /* About Section */
        .about-card {
          max-width: 850px;
          margin: 0 auto;
          padding: 48px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 8px 20px rgba(15, 58, 74, 0.08);
          border: 1px solid rgba(61, 181, 230, 0.08);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .about-card:hover {
          box-shadow: 0 24px 48px rgba(15, 58, 74, 0.15);
          transform: translateY(-4px);
          border-color: rgba(61, 181, 230, 0.15);
        }

        /* ===== "We Believe in Numbers" ===== */
        .about-numbers-section {
          position: relative;
          padding: 40px 0;
        }

        /* Large decorative background blob behind entire section */
        .about-numbers-section::before {
          content: '';
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(61, 181, 230, 0.05) 0%, rgba(79, 195, 247, 0.03) 50%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .about-numbers-section::after {
          content: '';
          position: absolute;
          bottom: -40px;
          right: -60px;
          width: 350px;
          height: 350px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(244, 114, 182, 0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .about-numbers-label {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #3db5e6;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 0.75rem;
          padding: 0.375rem 1rem;
          background: rgba(61, 181, 230, 0.08);
          border-radius: 50px;
          position: relative;
          z-index: 1;
        }

        .about-numbers-heading {
          font-size: clamp(1.75rem, 3.5vw, 2.5rem);
          font-weight: 800;
          color: #0a1f29;
          letter-spacing: -0.03em;
          line-height: 1.2;
          position: relative;
          z-index: 1;
        }

        /* Diamond/staggered grid: 3 columns, tall left/right, stacked center */
        .about-numbers-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr 1fr;
          grid-template-rows: auto auto;
          gap: 24px;
          max-width: 820px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .about-number-card {
          background: white;
          border-radius: 20px;
          padding: 32px 24px;
          text-align: center;
          box-shadow: 0 4px 24px rgba(15, 58, 74, 0.05), 0 1px 4px rgba(15, 58, 74, 0.03);
          border: 1px solid rgba(61, 181, 230, 0.06);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .about-number-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 48px rgba(15, 58, 74, 0.1), 0 4px 12px rgba(15, 58, 74, 0.06);
          border-color: rgba(61, 181, 230, 0.12);
        }

        /* Tall cards (left & right) span 2 rows, vertically centered */
        .about-number-card-tall {
          grid-row: 1 / 3;
          align-self: center;
          padding: 44px 28px;
        }

        /* Left card */
        .about-number-card-left {
          grid-column: 1;
        }

        /* Top-center card — positioned slightly higher */
        .about-number-card-top-center {
          grid-column: 2;
          grid-row: 1;
          margin-top: 0;
        }

        /* Bottom-center card */
        .about-number-card-bottom-center {
          grid-column: 2;
          grid-row: 2;
        }

        /* Right card */
        .about-number-card-right {
          grid-column: 3;
        }

        /* ===== Organic Blob Shapes ===== */
        .about-number-blob {
          width: 100px;
          height: 80px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          /* Soft glow behind blob */
          filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.08));
        }

        /* Faint background tint behind each blob */
        .about-number-blob::before {
          content: '';
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          opacity: 0.12;
          z-index: 0;
        }

        .about-number-blob-blue {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          border-radius: 60% 40% 45% 55% / 55% 45% 55% 45%;
          animation: blobMorph 8s ease-in-out infinite;
        }

        .about-number-blob-blue::before {
          background: #3b82f6;
        }

        .about-number-blob-teal {
          background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%);
          border-radius: 45% 55% 50% 50% / 50% 45% 55% 50%;
          animation: blobMorph 9s ease-in-out infinite reverse;
        }

        .about-number-blob-teal::before {
          background: #14b8a6;
        }

        .about-number-blob-coral {
          background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%);
          border-radius: 50% 50% 45% 55% / 55% 45% 55% 45%;
          animation: blobMorph 7.5s ease-in-out infinite;
        }

        .about-number-blob-coral::before {
          background: #ec4899;
        }

        .about-number-blob-yellow {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border-radius: 55% 45% 50% 50% / 50% 55% 45% 50%;
          animation: blobMorph 8.5s ease-in-out infinite reverse;
        }

        .about-number-blob-yellow::before {
          background: #f59e0b;
        }

        @keyframes blobMorph {
          0%, 100% { border-radius: 60% 40% 45% 55% / 55% 45% 55% 45%; }
          25% { border-radius: 45% 55% 55% 45% / 50% 55% 45% 50%; }
          50% { border-radius: 55% 45% 45% 55% / 45% 55% 55% 45%; }
          75% { border-radius: 50% 50% 50% 50% / 55% 45% 50% 50%; }
        }

        .about-number-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: white;
          position: relative;
          z-index: 2;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        }

        .about-number-title {
          font-size: 1.0625rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }

        .about-number-desc {
          font-size: 0.875rem;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0;
        }

        /* ===== What NOVAA Offers — V2 ===== */
        .about-offers-section {
          position: relative;
          padding: 40px 0;
        }

        .about-offers-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          max-width: 700px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .about-offer-card {
          background: white;
          border-radius: 20px;
          padding: 32px 24px;
          text-align: center;
          box-shadow: 0 4px 24px rgba(15, 58, 74, 0.05), 0 1px 4px rgba(15, 58, 74, 0.03);
          border: 1px solid rgba(61, 181, 230, 0.06);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .about-offer-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 48px rgba(15, 58, 74, 0.1), 0 4px 12px rgba(15, 58, 74, 0.06);
          border-color: rgba(61, 181, 230, 0.12);
        }

        /* Offer blob shapes (same morphing animation) */
        .about-offer-blob {
          width: 72px;
          height: 60px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.06));
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
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          border-radius: 60% 40% 45% 55% / 55% 45% 55% 45%;
          animation: blobMorph 8s ease-in-out infinite;
        }

        .about-offer-blob-blue::before {
          background: #3b82f6;
        }

        .about-offer-blob-teal {
          background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%);
          border-radius: 45% 55% 50% 50% / 50% 45% 55% 50%;
          animation: blobMorph 9s ease-in-out infinite reverse;
        }

        .about-offer-blob-teal::before {
          background: #14b8a6;
        }

        .about-offer-blob-coral {
          background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%);
          border-radius: 50% 50% 45% 55% / 55% 45% 55% 45%;
          animation: blobMorph 7.5s ease-in-out infinite;
        }

        .about-offer-blob-coral::before {
          background: #ec4899;
        }

        .about-offer-blob-yellow {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border-radius: 55% 45% 50% 50% / 50% 55% 45% 50%;
          animation: blobMorph 8.5s ease-in-out infinite reverse;
        }

        .about-offer-blob-yellow::before {
          background: #f59e0b;
        }

        .about-offer-title {
          font-size: 1.0625rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }

        .about-offer-desc {
          font-size: 0.875rem;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0;
        }

        /* Feature Cards */
        .feature-card-landing {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          height: 100%;
          border: 1px solid rgba(61, 181, 230, 0.08);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(15, 58, 74, 0.06);
          position: relative;
        }

        .feature-card-landing::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient-accent);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1;
        }

        .feature-card-landing:hover::before {
          transform: scaleX(1);
        }

        .feature-card-landing:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(15, 58, 74, 0.15), 0 0 24px rgba(61, 181, 230, 0.12);
          border-color: rgba(61, 181, 230, 0.2);
        }

        .feature-img-wrapper {
          height: 200px;
          overflow: hidden;
          position: relative;
        }

        .feature-img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .feature-card-landing:hover .feature-img-wrapper img {
          transform: scale(1.05);
        }

        .feature-icon {
          color: #3db5e6;
          font-size: 1.25rem;
          margin-right: 0.5rem;
        }

        /* CTA Section */
        .cta-section-landing {
          background: linear-gradient(135deg, #0a1f29 0%, #0f3a4a 50%, #134a5f 100%);
          position: relative;
          overflow: hidden;
          padding: 96px 0;
        }

        .cta-section-landing::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 30% 50%, rgba(61, 181, 230, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 70% 50%, rgba(79, 195, 247, 0.1) 0%, transparent 50%);
          pointer-events: none;
          animation: ctaGlow 6s ease-in-out infinite alternate;
        }

        @keyframes ctaGlow {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .cta-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(61, 181, 230, 0.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #4fc3f7;
          padding: 0.5rem 1.5rem;
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.8125rem;
          margin-bottom: 2rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: 1px solid rgba(61, 181, 230, 0.25);
        }

        .cta-features-list {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .cta-feature-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
          font-size: 0.9375rem;
          transition: all 0.3s ease;
        }

        .cta-feature-item:hover {
          color: white;
          transform: translateY(-2px);
        }

        .cta-feature-item i {
          color: #3db5e6;
          font-size: 1.125rem;
          filter: drop-shadow(0 0 8px rgba(61, 181, 230, 0.5));
        }

        /* Contact Form */
        .contact-card {
          background: white;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(61, 181, 230, 0.08);
          box-shadow: 0 8px 20px rgba(15, 58, 74, 0.08);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .contact-card:hover {
          box-shadow: 0 20px 40px rgba(15, 58, 74, 0.15);
          border-color: rgba(61, 181, 230, 0.15);
        }

        .form-control-landing,
        .form-select-landing {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 1rem;
        }

        .form-control-landing:focus,
        .form-select-landing:focus {
          border-color: #3db5e6;
          box-shadow: 0 0 0 3px rgba(61, 181, 230, 0.12);
          outline: none;
        }

        .form-control-landing:hover,
        .form-select-landing:hover {
          border-color: #cbd5e1;
        }

        /* Footer */
        .footer-landing {
          background: linear-gradient(135deg, #0a1f29 0%, #0f3a4a 50%, #134a5f 100%);
          padding: 64px 0 32px;
          position: relative;
        }

        .footer-landing::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(61, 181, 230, 0.3), transparent);
        }

        .footer-divider {
          border-color: rgba(255, 255, 255, 0.08);
          margin: 32px 0;
        }

        .version-badge {
          display: inline-block;
          background: var(--gradient-accent);
          color: white;
          padding: 0.1875rem 0.5rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-left: 0.5rem;
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        /* Floating Back to Top */
        .floating-top {
          position: fixed;
          bottom: 32px;
          right: 32px;
          width: 52px;
          height: 52px;
          background: var(--gradient-accent);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 24px rgba(61, 181, 230, 0.35);
          z-index: 9999;
          border: none;
        }

        .floating-top:hover {
          transform: translateY(-6px) scale(1.1);
          box-shadow: 0 16px 40px rgba(61, 181, 230, 0.5);
        }

        /* Responsive */
        @media (max-width: 991.98px) {
          .hero-section-landing {
            padding: 140px 0 100px;
            min-height: 90vh;
          }

          .section-landing {
            padding: 72px 0;
          }

          .navbar-collapse {
            background: rgba(1, 32, 43, 0.98);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 12px;
            padding: 1rem;
            margin-top: 0.75rem;
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(61, 181, 230, 0.15);
          }

          .nav-link-landing {
            padding: 0.75rem 1rem !important;
            margin: 0.25rem 0;
          }

          .btn-nav-login {
            width: 100%;
            text-align: center;
            margin-top: 0.5rem;
          }
        }

        @media (max-width: 767.98px) {
          .hero-section-landing {
            padding: 120px 0 80px;
            min-height: 80vh;
            background-attachment: scroll;
            background-image: linear-gradient(135deg, rgba(10, 31, 41, 0.92) 0%, rgba(15, 58, 74, 0.88) 50%, rgba(26, 92, 117, 0.84) 100%),
                              url(${heroBgImg});
            background-position: center;
            background-size: cover;
            background-repeat: no-repeat;
          }

          .section-landing {
            padding: 56px 0;
          }

          .about-card {
            padding: 32px 24px;
          }

          /* Mobile: stack cards in 2 columns */
          .about-numbers-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto auto;
            gap: 16px;
            max-width: 400px;
          }

          /* Reset grid positions for mobile */
          .about-number-card-tall {
            grid-row: auto;
            padding: 24px 16px;
          }

          .about-number-card-left {
            grid-column: 1;
            grid-row: 1;
          }

          .about-number-card-top-center {
            grid-column: 2;
            grid-row: 1;
          }

          .about-number-card-bottom-center {
            grid-column: 1;
            grid-row: 2;
          }

          .about-number-card-right {
            grid-column: 2;
            grid-row: 2;
          }

          .about-number-blob {
            width: 64px;
            height: 52px;
            margin-bottom: 12px;
          }

          .about-number-value {
            font-size: 1.125rem;
          }

          .about-number-title {
            font-size: 0.875rem;
          }

          .about-number-desc {
            font-size: 0.8125rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .cta-features-list {
            flex-direction: column;
            gap: 1rem;
          }

          .btn-hero-primary,
          .btn-hero-secondary {
            width: 100%;
            max-width: 280px;
          }

          .floating-top {
            bottom: 24px;
            right: 24px;
            width: 48px;
            height: 48px;
          }
        }

        /* Image Modal / Lightbox */
        .image-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 31, 41, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 10002;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          cursor: zoom-out;
        }

        .image-modal-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .image-modal-content img {
          max-width: 100%;
          max-height: 80vh;
          object-fit: contain;
          border-radius: 16px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
          cursor: default;
        }

        .image-modal-title {
          color: white;
          font-size: 1.125rem;
          font-weight: 600;
          text-align: center;
          letter-spacing: -0.01em;
        }

        .image-modal-close {
          position: absolute;
          top: -48px;
          right: 0;
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .image-modal-close:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        .feature-image-clickable {
          cursor: zoom-in;
          transition: opacity 0.3s ease;
        }

        .feature-image-clickable:hover {
          opacity: 0.9;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Scroll Progress Bar */}
      <motion.div className="scroll-progress-bar" style={{ scaleX }} />

      {/* Navigation */}
      <nav
        className={`landing-navbar navbar navbar-expand-lg navbar-dark sticky-top ${scrollY > 50 ? "scrolled" : ""}`}
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
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <Nav className="ms-auto align-items-center">
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
              <Nav.Item className="ms-2">
                <Button className="btn-nav-login" href="/login">
                  <i className="fas fa-sign-in-alt me-2"></i>Login
                </Button>
              </Nav.Item>
            </Nav>
          </div>
        </Container>
      </nav>

      {/* Hero Section */}
      <section className="hero-section-landing">
        {/* Enhanced background layers */}
        <div className="hero-grid-dots" />
        <div className="hero-lines" />
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />

        <Container>
          <div className="hero-content text-center">
            {/* Badge — Framer Motion fade */}
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

            {/* Title — Animate.css bounceInDown + bounceInRight */}
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

            {/* Subtitle — Framer Motion fade */}
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

            {/* CTAs — Framer Motion fade */}
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

      {/* About Section */}
      <section id="about" className="section-landing">
        <Container>
          {/* Section Heading with Animate.css bounceIn */}
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
            <h3
              className="fw-bold mb-4"
              style={{
                color: "#0a1f29",
                letterSpacing: "-0.02em",
                fontSize: "1.75rem",
              }}
            >
              Revolutionizing Educational Management
            </h3>
            <p
              className="mb-0"
              style={{
                color: "#475569",
                lineHeight: "1.8",
                fontSize: "1.0625rem",
              }}
            >
              NOVAA is a comprehensive education management platform designed to
              streamline operations across educational institutions. Our
              platform connects students, teachers, administrators, and parents
              through a unified digital ecosystem.
            </p>
          </motion.div>

          {/* ===== "We Believe in Numbers" Section ===== */}
          <div className="about-numbers-section mt-5">
            <div className="text-center mb-5">
              <span className="about-numbers-label">TALKING ABOUT NUMBERS</span>
              <h3 className="about-numbers-heading">We Believe in Numbers</h3>
            </div>

            <div className="about-numbers-grid">
              {/* Left — Students (tall card) */}
              <motion.div
                className="about-number-card about-number-card-tall about-number-card-left"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
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

              {/* Right — Uptime (tall card) */}
              <motion.div
                className="about-number-card about-number-card-tall about-number-card-right"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
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

          {/* ===== What NOVAA Offers — Redesigned ===== */}
          <div className="about-offers-section mt-5">
            <div className="text-center mb-5">
              <span className="about-numbers-label">WHY CHOOSE US</span>
              <h3 className="about-numbers-heading">What NOVAA Offers</h3>
            </div>

            <div className="about-offers-grid">
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

      {/* Features Section */}
      <section
        id="features"
        className="section-landing"
        style={{
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      >
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
              <Col md={6} lg={4} key={index}>
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
                    <h5
                      className="card-title text-center mb-3 fw-bold"
                      style={{ fontSize: "1.125rem", color: "#0a1f29" }}
                    >
                      <i className={`fas ${feature.icon} feature-icon`}></i>
                      {feature.title}
                    </h5>
                    <p
                      className="card-text text-center"
                      style={{ color: "#64748b", lineHeight: "1.7" }}
                    >
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="cta-section-landing">
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

      {/* Contact Section */}
      <section id="contact" className="section-landing">
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
                <div className="p-5">
                  <h3
                    className="fw-bold mb-3 text-center"
                    style={{ color: "#0a1f29", letterSpacing: "-0.02em" }}
                  >
                    <i
                      className="fas fa-paper-plane me-2"
                      style={{ color: "#3db5e6" }}
                    ></i>
                    Send Us a Message
                  </h3>
                  <p className="text-center mb-4" style={{ color: "#64748b" }}>
                    Fill out the form below and we'll get back to you within 24
                    hours.
                  </p>

                  <Form id="contactForm">
                    <Row className="g-4">
                      <Col md={6}>
                        <Form.Label
                          className="fw-bold"
                          style={{ color: "#134a5f" }}
                        >
                          First Name <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          className="form-control-landing"
                          placeholder="John"
                          required
                          minLength={2}
                          pattern="[A-Za-z\s]+"
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Label
                          className="fw-bold"
                          style={{ color: "#134a5f" }}
                        >
                          Last Name <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          className="form-control-landing"
                          placeholder="Doe"
                          required
                          minLength={2}
                          pattern="[A-Za-z\s]+"
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Label
                          className="fw-bold"
                          style={{ color: "#134a5f" }}
                        >
                          Email Address <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="email"
                          className="form-control-landing"
                          placeholder="john@example.com"
                          required
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Label
                          className="fw-bold"
                          style={{ color: "#134a5f" }}
                        >
                          Phone Number{" "}
                          <span className="text-muted">(Optional)</span>
                        </Form.Label>
                        <Form.Control
                          type="tel"
                          className="form-control-landing"
                          placeholder="+1 (555) 000-0000"
                          pattern="[+]?[0-9\s()\-]+"
                          minLength={10}
                        />
                      </Col>
                      <Col xs={12}>
                        <Form.Label
                          className="fw-bold"
                          style={{ color: "#134a5f" }}
                        >
                          Institution/Organization{" "}
                          <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          className="form-control-landing"
                          placeholder="Your institution name"
                          required
                          minLength={3}
                        />
                      </Col>
                      <Col xs={12}>
                        <Form.Label
                          className="fw-bold"
                          style={{ color: "#134a5f" }}
                        >
                          Your Role <span className="text-danger">*</span>
                        </Form.Label>
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
                        <Form.Label
                          className="fw-bold"
                          style={{ color: "#134a5f" }}
                        >
                          Your Message <span className="text-danger">*</span>
                        </Form.Label>
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
                          className="btn-hero-primary btn-lg px-5 py-3"
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

      {/* Footer */}
      <footer className="footer-landing">
        <Container>
          <Row>
            <Col lg={4} className="mb-4">
              <h5
                className="fw-bold mb-3 d-flex align-items-center gap-2"
                style={{ color: "white" }}
              >
                <img
                  src="/novaaa.png"
                  alt="NOVAA Logo"
                  style={{ height: "40px", width: "auto" }}
                />
              </h5>
              <p
                style={{ color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.8" }}
              >
                Modern education management platform designed to streamline
                operations and enhance learning experiences for institutions
                worldwide.
              </p>
            </Col>
          </Row>
          <hr className="footer-divider" />
          <Row>
            <Col className="text-center">
              <p className="mb-0" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                &copy; 2026 NOVAA <span className="version-badge">v2.1.0</span>.
                All rights reserved.
              </p>
            </Col>
          </Row>
        </Container>
      </footer>

      {/* Floating Back to Top */}
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

      {/* Image Lightbox Modal */}
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
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
