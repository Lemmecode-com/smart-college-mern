import { useEffect } from "react";

export default function LandingPage() {
  useEffect(() => {
    // Scroll Progress Indicator
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      const scrollProgress = document.querySelector(".scroll-progress");
      if (scrollProgress) {
        scrollProgress.style.width = scrollPercent + "%";
      }
    };

    // Navbar shadow on scroll
    const handleNavbarScroll = () => {
      const navbar = document.querySelector(".navbar");
      if (navbar) {
        if (window.scrollY > 50) {
          navbar.classList.add("scrolled");
        } else {
          navbar.classList.remove("scrolled");
        }
      }
    };

    // Intersection Observer for animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, observerOptions);

    document.querySelectorAll(".gsap-fade-up, .gsap-scale-up, .gsap-card").forEach((el) => {
      observer.observe(el);
    });

    // Floating Back to Top button visibility
    const floatingBackToTop = document.querySelector(".floating-back-to-top");
    const handleBackToTopScroll = () => {
      if (floatingBackToTop) {
        if (window.scrollY > window.innerHeight) {
          floatingBackToTop.classList.add("show");
        } else {
          floatingBackToTop.classList.remove("show");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("scroll", handleNavbarScroll);
    window.addEventListener("scroll", handleBackToTopScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleNavbarScroll);
      window.removeEventListener("scroll", handleBackToTopScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* Inline styles - In production, move to a separate CSS file */}
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
          --dark-color: #0a1f29;
          --gradient-primary: linear-gradient(135deg, #0f3a4a 0%, #3db5e6 100%);
          --gradient-hero: linear-gradient(135deg, rgba(15, 58, 74, 0.95) 0%, rgba(61, 181, 230, 0.9) 100%);
          --gradient-accent: linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%);
          --glass-bg: rgba(61, 181, 230, 0.1);
          --glass-border: rgba(61, 181, 230, 0.2);
          --shadow-lg: 0 25px 50px rgba(15, 58, 74, 0.3);
          --shadow-glow: 0 0 40px rgba(61, 181, 230, 0.4);
        }

        body {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          overflow-x: hidden;
        }

        html {
          scroll-behavior: smooth;
        }

        .scroll-progress {
          position: fixed;
          top: 0;
          left: 0;
          height: 4px;
          background: var(--gradient-primary);
          z-index: 10000;
          width: 0%;
          transition: width 0.1s ease;
        }

        .navbar {
          backdrop-filter: blur(20px);
          background: linear-gradient(180deg, rgba(1, 32, 43, 0.95) 0%, rgba(12, 48, 61, 0.92) 100%) !important;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(47, 188, 243, 0.15);
        }

        .navbar.scrolled {
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4) !important;
          background: linear-gradient(180deg, rgba(1, 14, 20, 0.98) 0%, rgba(15, 58, 74, 0.95) 100%) !important;
          padding: 0.5rem 0;
        }

        .navbar-brand {
          font-weight: 900;
          color: white !important;
          font-size: 1.85rem !important;
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
        }

        .navbar-brand img {
          height: 50px;
          width: auto;
          filter: drop-shadow(0 2px 8px rgba(61, 181, 230, 0.4));
          transition: all 0.3s ease;
        }

        .nav-link {
          font-weight: 600;
          color: #e6f2f5 !important;
          position: relative;
          margin: 0 0.25rem;
          padding: 0.5rem 1rem !important;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .nav-link:hover {
          color: #4fc3f7 !important;
          transform: translateY(-2px);
        }

        .nav-btn {
          background: linear-gradient(135deg, #1a3f4e 0%, #1a3740 100%);
          color: white !important;
          padding: 0.65rem 1.75rem !important;
          border-radius: 50px;
          font-weight: 700;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(26, 63, 78, 0.5);
          border: 2px solid transparent;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .nav-btn:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 8px 30px rgba(5, 40, 56, 0.7);
          background: linear-gradient(135deg, #052838 0%, #2f5b6c 100%);
          border-color: #2f5b6c;
          color: white !important;
        }

        .hero-section {
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.92) 0%, rgba(26, 92, 117, 0.85) 100%);
          background-attachment: fixed;
          color: white;
          padding: 120px 0 80px;
          position: relative;
          overflow: hidden;
          min-height: 100vh;
          display: flex;
          align-items: center;
        }

        .hero-content {
          position: relative;
          z-index: 2;
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 900;
          line-height: 1.2;
          margin-bottom: 1.5rem;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .hero-title .highlight {
          background: linear-gradient(135deg, #4fc3f7 0%, #3db5e6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 20px rgba(61, 181, 230, 0.5));
        }

        .hero-lead {
          font-size: 1.25rem;
          opacity: 0.95;
          margin-bottom: 2rem;
          line-height: 1.8;
        }

        .btn-hero {
          background: linear-gradient(135deg, #1a3f4e 0%, #1a3740 100%);
          color: white;
          font-weight: 700;
          padding: 1rem 2.5rem;
          border-radius: 50px;
          border: 2px solid transparent;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 10px 30px rgba(26, 63, 78, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn-hero:hover {
          transform: translateY(-5px) scale(1.05);
          box-shadow: 0 20px 45px rgba(5, 40, 56, 0.7);
          background: linear-gradient(135deg, #052838 0%, #2f5b6c 100%);
          border-color: #2f5b6c;
          color: white;
        }

        .btn-hero-outline {
          background: transparent;
          color: white;
          font-weight: 700;
          padding: 1rem 2.5rem;
          border-radius: 50px;
          border: 2px solid rgba(26, 63, 78, 0.6);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn-hero-outline:hover {
          background: rgba(5, 40, 56, 0.3);
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(5, 40, 56, 0.5);
          border-color: #2f5b6c;
          color: white;
        }

        .feature-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          height: 100%;
          border: 1px solid rgba(61, 181, 230, 0.15);
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }

        .feature-card:hover {
          transform: translateY(-15px) scale(1.02);
          box-shadow: 0 25px 50px rgba(15, 58, 74, 0.2), 0 0 40px rgba(61, 181, 230, 0.3);
          border-color: var(--primary-lighter);
        }

        .section-padding {
          padding: 100px 0;
        }

        .section-title {
          font-size: 2.75rem;
          font-weight: 900;
          color: var(--dark-color);
          margin-bottom: 1rem;
          position: relative;
          display: inline-block;
        }

        .section-title::after {
          content: "";
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 4px;
          background: var(--gradient-accent);
          border-radius: 2px;
          box-shadow: 0 0 10px rgba(61, 181, 230, 0.5);
        }

        .section-subtitle {
          color: #6c757d;
          font-size: 1.125rem;
          margin-top: 1.5rem;
        }

        .bg-light {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
        }

        .cta-section {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5c75 100%);
          position: relative;
          overflow: hidden;
          padding: 120px 0;
        }

        .cta-content {
          position: relative;
          z-index: 2;
          text-align: center;
        }

        .cta-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(61, 181, 230, 0.15);
          backdrop-filter: blur(10px);
          color: #4fc3f7;
          padding: 0.6rem 1.75rem;
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          border: 1px solid rgba(61, 181, 230, 0.3);
        }

        .cta-section .section-title {
          color: white;
          font-size: 3rem;
          margin-bottom: 1.5rem;
        }

        .cta-section .section-subtitle {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.25rem;
          max-width: 700px;
          margin: 0 auto 2.5rem;
          line-height: 1.8;
        }

        .cta-buttons {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          margin-bottom: 2.5rem;
        }

        .cta-features {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2.5rem;
          flex-wrap: wrap;
        }

        .cta-feature {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: rgba(255, 255, 255, 0.95);
          font-weight: 500;
          font-size: 1rem;
        }

        .cta-feature i {
          color: #3db5e6;
          font-size: 1.25rem;
          filter: drop-shadow(0 0 8px rgba(61, 181, 230, 0.6));
        }

        .floating-back-to-top {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 55px;
          height: 55px;
          background: linear-gradient(135deg, #1a3f4e 0%, #1a3740 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.4rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          box-shadow: 0 10px 35px rgba(26, 63, 78, 0.5);
          z-index: 9999;
          opacity: 0;
          visibility: hidden;
          transform: translateY(20px) scale(0.8);
          border: 2px solid rgba(26, 63, 78, 0.3);
        }

        .floating-back-to-top.show {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }

        .floating-back-to-top:hover {
          transform: translateY(-8px) scale(1.1);
          box-shadow: 0 15px 45px rgba(5, 40, 56, 0.7);
          background: linear-gradient(135deg, #052838 0%, #2f5b6c 100%);
        }

        .gsap-fade-up {
          opacity: 0;
          transform: translateY(50px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }

        .gsap-fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .gsap-scale-up {
          opacity: 0;
          transform: scale(0.8);
          transition: opacity 1s ease, transform 1s ease;
        }

        .gsap-scale-up.visible {
          opacity: 1;
          transform: scale(1);
        }

        .gsap-card {
          opacity: 0;
          transform: translateY(100px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }

        .gsap-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }
          .section-title {
            font-size: 2rem;
          }
          .cta-badge {
            font-size: 0.75rem;
            padding: 0.4rem 1rem;
          }
        }
      `}</style>

      {/* Scroll Progress Indicator */}
      <div className="scroll-progress"></div>

      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark sticky-top">
        <div className="container">
          <a className="navbar-brand fs-2" href="#">
            <img src="/novaaa.png" alt="NOVAA Logo" style={{ height: "50px", width: "auto" }} />
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-center">
              <li className="nav-item">
                <a className="nav-link" href="#about">About</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#features">Features</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#contact">Contact</a>
              </li>
              <li className="nav-item ms-2">
                <a className="btn nav-btn" href="/login">
                  <i className="fas fa-sign-in-alt me-2"></i>Login
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10 hero-content text-center">
              <h1 className="hero-title mb-4">
                Transform Your<br />
                Educational <span className="highlight">Institution</span>
              </h1>
              <p className="hero-lead mb-5">
                Comprehensive college management platform designed to streamline
                operations, enhance learning experiences, and connect students,
                teachers, and administrators seamlessly.
              </p>
              <div className="d-flex gap-3 flex-wrap justify-content-center">
                <a href="/register" className="btn btn-hero">
                  <i className="fas fa-rocket me-2"></i>Get Started
                </a>
                <a href="#features" className="btn btn-hero-outline">
                  <i className="fas fa-info-circle me-2"></i>Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="section-padding">
        <div className="container">
          <div className="row mb-5">
            <div className="col-12 text-center">
              <h2 className="section-title gsap-fade-up">About NOVAA</h2>
              <p className="section-subtitle gsap-fade-up">
                Transforming education through innovative technology solutions
              </p>
            </div>
          </div>
          <div className="text-center">
            <div className="">
              <h3 className="fw-bold mb-4 gsap-fade-up">
                Revolutionizing Educational Management
              </h3>
              <p className="mb-4 gsap-fade-up">
                NOVAA is a comprehensive education management platform designed to
                streamline operations across educational institutions. Our
                platform connects students, teachers, administrators, and parents
                through a unified digital ecosystem.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding bg-light">
        <div className="container">
          <div className="row mb-5">
            <div className="col-12 text-center">
              <h2 className="section-title gsap-fade-up">Powerful Features</h2>
              <p className="section-subtitle gsap-fade-up">
                Everything you need to manage your educational institution efficiently
              </p>
            </div>
          </div>

          <div id="featuresCarousel" className="carousel slide" data-bs-ride="carousel" data-bs-interval="4000">
            <div className="carousel-inner">
              {/* Slide 1 - Student Management */}
              <div className="carousel-item active">
                <div className="row justify-content-center">
                  <div className="col-md-8 col-lg-5">
                    <div className="card feature-card h-100 border-0 shadow-sm gsap-card">
                      <div className="card-img-top" style={{ height: "200px", overflow: "hidden" }}>
                        <img
                          src="./images/novaa03.png"
                          className="img-fluid w-100"
                          alt="Student Management"
                          style={{ objectFit: "cover" }}
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=250&q=80";
                          }}
                        />
                      </div>
                      <div className="card-body p-4">
                        <h5 className="card-title text-center mb-3">
                          <i className="fas fa-user-graduate me-2" style={{ color: "var(--primary-lighter)" }}></i>
                          Student Management
                        </h5>
                        <p className="card-text text-center" style={{ color: "#5a6c75" }}>
                          Complete student lifecycle management from admission to
                          graduation with detailed records and analytics.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 2 - Teacher Portal */}
              <div className="carousel-item">
                <div className="row justify-content-center">
                  <div className="col-md-8 col-lg-5">
                    <div className="card feature-card h-100 border-0 shadow-sm gsap-card">
                      <div className="card-img-top" style={{ height: "200px", overflow: "hidden" }}>
                        <img
                          src="./images/novaa04.png"
                          className="img-fluid w-100"
                          alt="Teacher Portal"
                          style={{ objectFit: "cover" }}
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1544531586-fde5298cdd40?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=250&q=80";
                          }}
                        />
                      </div>
                      <div className="card-body p-4">
                        <h5 className="card-title text-center mb-3">
                          <i className="fas fa-chalkboard-teacher me-2" style={{ color: "var(--primary-lighter)" }}></i>
                          Teacher Portal
                        </h5>
                        <p className="card-text text-center" style={{ color: "#5a6c75" }}>
                          Empower educators with tools for attendance, grading,
                          timetables, and communication with students.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 3 - Timetable Management */}
              <div className="carousel-item">
                <div className="row justify-content-center">
                  <div className="col-md-8 col-lg-5">
                    <div className="card feature-card h-100 border-0 shadow-sm gsap-card">
                      <div className="card-img-top" style={{ height: "200px", overflow: "hidden" }}>
                        <img
                          src="./images/novaa05.png"
                          className="img-fluid w-100"
                          alt="Timetable Management"
                          style={{ objectFit: "cover" }}
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=250&q=80";
                          }}
                        />
                      </div>
                      <div className="card-body p-4">
                        <h5 className="card-title text-center mb-3">
                          <i className="fas fa-calendar-alt me-2" style={{ color: "var(--primary-lighter)" }}></i>
                          Timetable Management
                        </h5>
                        <p className="card-text text-center" style={{ color: "#5a6c75" }}>
                          Intelligent scheduling system that creates conflict-free
                          timetables for classes and exams.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 4 - Fee Management */}
              <div className="carousel-item">
                <div className="row justify-content-center">
                  <div className="col-md-8 col-lg-5">
                    <div className="card feature-card h-100 border-0 shadow-sm gsap-card">
                      <div className="card-img-top" style={{ height: "200px", overflow: "hidden" }}>
                        <img
                          src="./images/novaa06.png"
                          className="img-fluid w-100"
                          alt="Fee Management"
                          style={{ objectFit: "cover" }}
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=250&q=80";
                          }}
                        />
                      </div>
                      <div className="card-body p-4">
                        <h5 className="card-title text-center mb-3">
                          <i className="fas fa-file-invoice-dollar me-2" style={{ color: "var(--primary-lighter)" }}></i>
                          Fee Management
                        </h5>
                        <p className="card-text text-center" style={{ color: "#5a6c75" }}>
                          Automated fee calculation, payment processing, and financial
                          reporting for transparent billing.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 5 - Analytics & Reports */}
              <div className="carousel-item">
                <div className="row justify-content-center">
                  <div className="col-md-8 col-lg-5">
                    <div className="card feature-card h-100 border-0 shadow-sm gsap-card">
                      <div className="card-img-top" style={{ height: "200px", overflow: "hidden" }}>
                        <img
                          src="./images/novaa07.png"
                          className="img-fluid w-100"
                          alt="Analytics & Reports"
                          style={{ objectFit: "cover" }}
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=250&q=80";
                          }}
                        />
                      </div>
                      <div className="card-body p-4">
                        <h5 className="card-title text-center mb-3">
                          <i className="fas fa-chart-line me-2" style={{ color: "var(--primary-lighter)" }}></i>
                          Analytics & Reports
                        </h5>
                        <p className="card-text text-center" style={{ color: "#5a6c75" }}>
                          Comprehensive dashboards with insights on academics,
                          attendance, and institutional performance.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 6 - Notifications */}
              <div className="carousel-item">
                <div className="row justify-content-center">
                  <div className="col-md-8 col-lg-5">
                    <div className="card feature-card h-100 border-0 shadow-sm gsap-card">
                      <div className="card-img-top" style={{ height: "200px", overflow: "hidden" }}>
                        <img
                          src="./images/novaa08.png"
                          className="img-fluid w-100"
                          alt="Notifications"
                          style={{ objectFit: "cover" }}
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=250&q=80";
                          }}
                        />
                      </div>
                      <div className="card-body p-4">
                        <h5 className="card-title text-center mb-3">
                          <i className="fas fa-bell me-2" style={{ color: "var(--primary-lighter)" }}></i>
                          Notifications
                        </h5>
                        <p className="card-text text-center" style={{ color: "#5a6c75" }}>
                          Real-time alerts and notifications to keep all stakeholders
                          informed about important updates.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Carousel Controls */}
            <button
              className="carousel-control-prev"
              type="button"
              data-bs-target="#featuresCarousel"
              data-bs-slide="prev"
            >
              <span className="carousel-control-prev-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Previous</span>
            </button>
            <button
              className="carousel-control-next"
              type="button"
              data-bs-target="#featuresCarousel"
              data-bs-slide="next"
            >
              <span className="carousel-control-next-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Next</span>
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container cta-content">
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <span className="cta-badge gsap-fade-up">
                <i className="fas fa-rocket"></i>
                <span>Limited Time Offer</span>
              </span>
              <h2 className="section-title gsap-fade-up">
                Ready to Transform Your Institution?
              </h2>
              <p className="section-subtitle gsap-fade-up">
                Join hundreds of educational institutions that trust NOVAA for
                their management needs. Start your journey towards digital
                excellence today.
              </p>
              <div className="cta-buttons">
                <a href="#contact" className="btn btn-hero">
                  <i className="fas fa-play-circle me-2"></i>Start Free Trial
                </a>
                <a href="#contact" className="btn btn-hero-outline">
                  <i className="fas fa-calendar-alt me-2"></i>Schedule Demo
                </a>
              </div>
              <div className="cta-features">
                <div className="cta-feature">
                  <i className="fas fa-check-circle"></i>
                  <span>14-Day Free Trial</span>
                </div>
                <div className="cta-feature">
                  <i className="fas fa-check-circle"></i>
                  <span>No Credit Card Required</span>
                </div>
                <div className="cta-feature">
                  <i className="fas fa-check-circle"></i>
                  <span>24/7 Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="section-padding">
        <div className="container">
          <div className="row mb-5">
            <div className="col-12 text-center">
              <h2 className="section-title gsap-fade-up">Get In Touch</h2>
              <p className="section-subtitle gsap-fade-up">
                Have questions? Our team is here to help you get started
              </p>
            </div>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card feature-card h-100 border-0 shadow-sm gsap-fade-up">
                <div className="card-body p-5">
                  <h3 className="fw-bold mb-3 text-center" style={{ color: "var(--primary-darkest)" }}>
                    <i className="fas fa-paper-plane me-2" style={{ color: "var(--primary-lighter)" }}></i>
                    Send Us a Message
                  </h3>
                  <p className="text-center mb-4" style={{ color: "#5a6c75" }}>
                    Fill out the form below and we'll get back to you within 24 hours.
                  </p>

                  <form id="contactForm">
                    <div className="row g-4">
                      <div className="col-md-6">
                        <label htmlFor="firstName" className="form-label fw-bold" style={{ color: "var(--primary-dark)" }}>
                          First Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-lg"
                          id="firstName"
                          placeholder="John"
                          required
                          minLength="2"
                          pattern="[A-Za-z\s]+"
                        />
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="lastName" className="form-label fw-bold" style={{ color: "var(--primary-dark)" }}>
                          Last Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-lg"
                          id="lastName"
                          placeholder="Doe"
                          required
                          minLength="2"
                          pattern="[A-Za-z\s]+"
                        />
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="email" className="form-label fw-bold" style={{ color: "var(--primary-dark)" }}>
                          Email Address <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className="form-control form-control-lg"
                          id="email"
                          placeholder="john@example.com"
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="phone" className="form-label fw-bold" style={{ color: "var(--primary-dark)" }}>
                          Phone Number <span className="text-muted">(Optional)</span>
                        </label>
                        <input
                          type="tel"
                          className="form-control form-control-lg"
                          id="phone"
                          placeholder="+1 (555) 000-0000"
                          pattern="[+]?[0-9\s()\-]+"
                          minLength="10"
                        />
                      </div>

                      <div className="col-12">
                        <label htmlFor="institution" className="form-label fw-bold" style={{ color: "var(--primary-dark)" }}>
                          Institution/Organization <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-lg"
                          id="institution"
                          placeholder="Your institution name"
                          required
                          minLength="3"
                        />
                      </div>

                      <div className="col-12">
                        <label htmlFor="role" className="form-label fw-bold" style={{ color: "var(--primary-dark)" }}>
                          Your Role <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select form-select-lg"
                          id="role"
                          required
                        >
                          <option value="" disabled selected>Select your role</option>
                          <option value="principal">Principal</option>
                          <option value="admin">Administrator</option>
                          <option value="teacher">Teacher</option>
                          <option value="student">Student</option>
                          <option value="parent">Parent</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="col-12">
                        <label htmlFor="message" className="form-label fw-bold" style={{ color: "var(--primary-dark)" }}>
                          Your Message <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control form-control-lg"
                          id="message"
                          rows="5"
                          placeholder="Tell us how we can help you..."
                          required
                          minLength="10"
                        ></textarea>
                      </div>

                      <div className="col-12 text-center">
                        <button type="submit" className="btn btn-hero btn-lg px-5 py-3">
                          <i className="fas fa-paper-plane me-2"></i>
                          <span>Send Message</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="" style={{ background: "linear-gradient(135deg, #0a1f29 0%, #0f3a4a 50%, #134a5f 100%)", padding: "60px 0 30px" }}>
        <div className="container">
          <div className="row">
            <div className="col-lg-4 col-md-6 mb-4">
              <h5 className="fw-bold mb-3" style={{ color: "white" }}>
                <img src="/novaaa.png" alt="NOVAA Logo" style={{ height: "40px", width: "auto", marginRight: "0.5rem" }} />
                NOVAA
              </h5>
              <p style={{ color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.8" }}>
                Modern education management platform designed to streamline
                operations and enhance learning experiences for institutions
                worldwide.
              </p>
            </div>
          </div>
          <hr style={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />
          <div className="row">
            <div className="col-12 text-center">
              <p className="mb-0" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                &copy; 2026 NOVAA <span className="version-badge" style={{ display: "inline-block", background: "var(--gradient-accent)", color: "white", padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "600", marginLeft: "0.5rem" }}>v2.1.0</span>. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Back to Top Button */}
      <div
        className="floating-back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        title="Back to Top"
      >
        <i className="fas fa-arrow-up"></i>
      </div>
    </>
  );
}
