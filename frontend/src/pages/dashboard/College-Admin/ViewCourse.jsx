import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { Badge } from "react-bootstrap";

import {
  FaBookOpen,
  FaLayerGroup,
  FaAward,
  FaClock,
  FaTag,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaEdit,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaInfoCircle,
  FaCopy
} from "react-icons/fa";

export default function ViewCourse() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH COURSE ================= */
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        setCourse(res.data?.course || res.data);
      } catch (err) {
        setError("Failed to load course details. Please try again.");
        console.error("Course fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading course details..." />;
  }

  /* ================= ERROR/NOT FOUND STATE ================= */
  if (error || !course) {
    return (
      <div className="view-course-page">
        <div className="error-state">
          <div className="error-state__icon">
            <FaTimesCircle />
          </div>
          <h3 className="error-state__title">{error || "Course not found"}</h3>
          <p className="error-state__message">
            The course you're looking for doesn't exist or has been removed.
          </p>
          <button
            className="btn btn--primary"
            onClick={() => navigate('/courses')}
          >
            <FaArrowLeft /> Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const handleCopyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusVariant = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'active') return 'success';
    if (statusLower === 'inactive') return 'secondary';
    if (statusLower === 'pending') return 'warning';
    if (statusLower === 'archived') return 'danger';
    return 'secondary';
  };

  const getTypeVariant = (type) => {
    const typeLower = type?.toLowerCase();
    if (typeLower === 'theory') return 'info';
    if (typeLower === 'practical') return 'warning';
    if (typeLower === 'both') return 'primary';
    return 'secondary';
  };

  const getLevelVariant = (level) => {
    const levelLower = level?.toLowerCase();
    if (levelLower?.includes('undergraduate') || levelLower?.includes('bachelor')) return 'primary';
    if (levelLower?.includes('postgraduate') || levelLower?.includes('master')) return 'purple';
    if (levelLower?.includes('doctorate') || levelLower?.includes('phd')) return 'danger';
    if (levelLower?.includes('diploma')) return 'info';
    return 'secondary';
  };

  return (
    <div className="view-course-page">
      {/* PAGE HEADER */}
      <header className="page-header">
        <div className="page-header__content">
          {/* LEFT SECTION - Back Button + Icon + Title + Badges */}
          <div className="page-header__left">
            <button
              className="btn btn--icon"
              onClick={() => navigate('/courses')}
              aria-label="Back to courses"
              title="Back to courses"
            >
              <FaArrowLeft />
            </button>
            <div className="page-header__icon-wrapper">
              <FaBookOpen className="page-header__icon" />
            </div>
            <div className="page-header__info">
              <h1 className="page-header__title">{course.name}</h1>
              <div className="page-header__badges">
                <span
                  className="course-code"
                  onClick={() => handleCopyToClipboard(course.code, 'code')}
                  title="Click to copy course code"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleCopyToClipboard(course.code, 'code')}
                >
                  <FaTag className="course-code__icon" />
                  {course.code}
                  {copiedField === 'code' && (
                    <span className="copy-tooltip">Copied!</span>
                  )}
                </span>
                <span className={`status-badge status-badge--${course.status?.toLowerCase()}`}>
                  <FaCheckCircle /> {course.status || 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION - Edit Course Button */}
          <div className="page-header__right">
            <button
              className="btn btn--primary"
              onClick={() => navigate(`/courses/edit/${course._id}`)}
            >
              <FaEdit /> Edit Course
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="page-content">
        {/* OVERVIEW CARD */}
        <section className="card card--overview">
          <div className="card__header">
            <div className="card__header-left">
              <FaInfoCircle className="card__header-icon" />
              <h2 className="card__title">Course Overview</h2>
            </div>
          </div>
          <div className="card__body">
            <div className="overview-grid">
              <OverviewItem
                icon={<FaLayerGroup />}
                label="Program Level"
                value={course.programLevel || "Not specified"}
                variant={getLevelVariant(course.programLevel)}
              />
              <OverviewItem
                icon={<FaBuilding />}
                label="Department"
                value={course.department_id?.name || "Not assigned"}
                isLink={!!course.department_id}
                onClick={() => course.department_id && navigate(`/departments/${course.department_id._id}`)}
              />
              <OverviewItem
                icon={<FaChalkboardTeacher />}
                label="Course Type"
                value={course.type || "Not specified"}
                badge
                variant={getTypeVariant(course.type)}
              />
              <OverviewItem
                icon={<FaUserGraduate />}
                label="Max Students"
                value={course.maxStudents ? `${course.maxStudents} students` : "No limit"}
              />
            </div>
          </div>
        </section>

        {/* COURSE DETAILS GRID */}
        <section className="card card--details">
          <div className="card__header">
            <div className="card__header-left">
              <FaAward className="card__header-icon" />
              <h2 className="card__title">Course Details</h2>
            </div>
          </div>
          <div className="card__body">
            <div className="details-grid">
              <DetailItem
                icon={<FaTag />}
                label="Course Code"
                value={course.code}
                onCopy={() => handleCopyToClipboard(course.code, 'detail-code')}
                showCopy
              />
              <DetailItem
                icon={<FaLayerGroup />}
                label="Program Level"
                value={course.programLevel || "Not specified"}
              />
              <DetailItem
                icon={<FaBuilding />}
                label="Department"
                value={course.department_id?.name || "Not assigned"}
              />
              <DetailItem
                icon={<FaChalkboardTeacher />}
                label="Course Type"
                value={
                  <Badge 
                    bg={getTypeVariant(course.type)} 
                    className="detail-badge"
                  >
                    {course.type || "N/A"}
                  </Badge>
                }
              />
              <DetailItem
                icon={<FaUserGraduate />}
                label="Maximum Students"
                value={course.maxStudents || "No limit"}
              />
              <DetailItem
                icon={<FaAward />}
                label="Credits"
                value={course.credits || "Not specified"}
              />
              <DetailItem
                icon={<FaClock />}
                label="Duration (Semesters)"
                value={`${course.durationSemesters || 'N/A'} semesters`}
              />
              <DetailItem
                icon={<FaCalendarAlt />}
                label="Duration (Years)"
                value={`${course.durationYears || 'N/A'} years`}
              />
              <DetailItem
                icon={<FaCheckCircle />}
                label="Status"
                value={
                  <Badge 
                    bg={getStatusVariant(course.status)} 
                    className="detail-badge"
                  >
                    {course.status || "N/A"}
                  </Badge>
                }
              />
              <DetailItem
                icon={<FaCalendarAlt />}
                label="Created At"
                value={course.createdAt ? new Date(course.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                }) : "Not available"}
              />
              <DetailItem
                icon={<FaCalendarAlt />}
                label="Last Updated"
                value={course.updatedAt ? new Date(course.updatedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                }) : "Not available"}
              />
            </div>
          </div>
        </section>
      </main>

      <style>{`
        /* =====================================================
           VIEW COURSE PAGE - Enterprise SaaS Design
           Matching Sidebar Color Scheme
           ===================================================== */

        :root {
          /* Brand Colors - Matching Sidebar */
          --brand-primary: #1a4b6d;
          --brand-primary-dark: #0f3a4a;
          --brand-primary-light: #2a6b8d;
          --brand-accent: #4fc3f7;
          --brand-success: #28a745;
          --brand-warning: #ffc107;
          --brand-danger: #dc3545;
          --brand-info: #17a2b8;
          --brand-purple: #6f42c1;
          --brand-secondary: #6c757d;

          /* Background Colors */
          --bg-page: #f5f7fa;
          --bg-card: #ffffff;
          --bg-hover: #f8f9fa;

          /* Text Colors */
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --text-inverse: #ffffff;

          /* Border Colors */
          --border-light: #e2e8f0;
          --border-medium: #cbd5e1;

          /* Shadows */
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
          --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
          --shadow-xl: 0 12px 40px rgba(0, 0, 0, 0.15);

          /* Border Radius */
          --radius-sm: 0.375rem;
          --radius-md: 0.5rem;
          --radius-lg: 0.75rem;
          --radius-xl: 1rem;
          --radius-2xl: 1.25rem;

          /* Spacing */
          --spacing-xs: 0.25rem;
          --spacing-sm: 0.5rem;
          --spacing-md: 0.75rem;
          --spacing-lg: 1rem;
          --spacing-xl: 1.25rem;
          --spacing-2xl: 1.5rem;
          --spacing-3xl: 2rem;

          /* Transitions */
          --transition-fast: 150ms ease;
          --transition-base: 250ms ease;
          --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ================= PAGE WRAPPER ================= */
        .view-course-page {
          min-height: 100vh;
          background: var(--bg-page);
          padding: 0;
        }

        /* ================= PAGE HEADER ================= */
        .page-header {
          background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
          color: var(--text-inverse);
          padding: 20px 28px;
          margin-bottom: var(--spacing-2xl);
          box-shadow: var(--shadow-lg);
          border-radius: 18px;
        }

        .page-header__content {
          width: 1460px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--spacing-lg);
        }

        /* ================= LEFT SECTION - Back Button + Icon + Title + Badges ================= */
        .page-header__left {
          display: flex;
          align-items: left;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        /* ================= RIGHT SECTION - Edit Button ================= */
        .page-header__right {
          display: flex;
          justify-content: flex-end;
          align-items: end;
          flex-shrink: 0;
        }

        /* Back Button */
        .btn--icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: var(--text-inverse);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .btn--icon:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateX(-2px);
        }

        /* Course Icon Wrapper */
        .page-header__icon-wrapper {
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.375rem;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all var(--transition-base);
        }

        .page-header__icon-wrapper:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .page-header__icon {
          color: var(--text-inverse);
        }

        /* Course Info Section */
        .page-header__info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .page-header__title {
          margin: 0;
          font-size: 1.625rem;
          font-weight: 700;
          line-height: 1.2;
          color: var(--text-inverse);
          letter-spacing: -0.02em;
        }

        /* Badges Row */
        .page-header__badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .course-code {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--text-inverse);
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .course-code:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.35);
        }

        .course-code__icon {
          font-size: 0.6875rem;
          opacity: 0.85;
        }

        .copy-tooltip {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: var(--brand-success);
          color: white;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: var(--shadow-md);
          animation: tooltip-fade-in 0.2s ease;
        }

        @keyframes tooltip-fade-in {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all var(--transition-fast);
        }

        .status-badge--active {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.35);
        }

        .status-badge--inactive {
          background: rgba(107, 114, 128, 0.2);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.35);
        }

        .status-badge--pending {
          background: rgba(255, 193, 7, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(255, 193, 7, 0.35);
        }

        .status-badge--archived {
          background: rgba(220, 53, 69, 0.2);
          color: #f87171;
          border: 1px solid rgba(220, 53, 69, 0.35);
        }

        /* ================= ACTIONS ================= */
        .page-header__actions {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        /* ================= BUTTONS ================= */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: none;
          min-height: 44px;
          white-space: nowrap;
        }

        .btn--primary {
          background: var(--brand-success);
          color: var(--text-inverse);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn--primary:hover {
          background: #218838;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
        }

        .btn--primary:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
        }

        .btn--outline {
          background: transparent;
          color: var(--text-inverse);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn--outline:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.5);
        }

        /* ================= PAGE CONTENT ================= */
        .page-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 var(--spacing-3xl) var(--spacing-3xl);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2xl);
        }

        /* ================= CARD COMPONENT ================= */
        .card {
          background: var(--bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-md);
          overflow: hidden;
          border: 1px solid var(--border-light);
          transition: all var(--transition-base);
        }

        .card:hover {
          box-shadow: var(--shadow-lg);
        }

        .card__header {
          padding: var(--spacing-lg) var(--spacing-xl);
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid var(--border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card__header-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .card__header-icon {
          font-size: 1.25rem;
          color: var(--brand-primary);
        }

        .card__title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .card__body {
          padding: var(--spacing-xl);
        }

        /* ================= OVERVIEW GRID ================= */
        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--spacing-lg);
        }

        .overview-item {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
          background: var(--bg-hover);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          transition: all var(--transition-fast);
          cursor: default;
        }

        .overview-item--clickable {
          cursor: pointer;
        }

        .overview-item--clickable:hover {
          background: #f1f5f9;
          border-color: var(--brand-accent);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .overview-item__icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-light) 100%);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .overview-item__content {
          flex: 1;
          min-width: 0;
        }

        .overview-item__label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: var(--spacing-xs);
        }

        .overview-item__value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
        }

        /* ================= DETAILS GRID ================= */
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--spacing-lg);
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          padding: var(--spacing-lg);
          background: var(--bg-hover);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          transition: all var(--transition-fast);
          position: relative;
        }

        .detail-item:hover {
          border-color: var(--brand-accent);
          background: #f8fafc;
        }

        .detail-item__header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .detail-item__icon {
          font-size: 1rem;
          color: var(--brand-primary);
          flex-shrink: 0;
        }

        .detail-item__label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-item__value {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.5;
          word-break: break-word;
        }

        .detail-item__copy-btn {
          position: absolute;
          top: var(--spacing-md);
          right: var(--spacing-md);
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: transparent;
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          opacity: 0;
        }

        .detail-item:hover .detail-item__copy-btn {
          opacity: 1;
        }

        .detail-item__copy-btn:hover {
          background: var(--brand-primary);
          border-color: var(--brand-primary);
          color: white;
        }

        .detail-badge {
          font-size: 0.8125rem;
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ================= ERROR STATE ================= */
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          text-align: center;
          padding: var(--spacing-3xl);
        }

        .error-state__icon {
          width: 80px;
          height: 80px;
          background: rgba(220, 53, 69, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          color: var(--brand-danger);
          margin-bottom: var(--spacing-xl);
        }

        .error-state__title {
          margin: 0 0 var(--spacing-md) 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .error-state__message {
          margin: 0 0 var(--spacing-xl) 0;
          font-size: 1rem;
          color: var(--text-secondary);
          max-width: 400px;
        }

        /* ================= RESPONSIVE STYLES ================= */
        @media (max-width: 1024px) {
          .page-header__content {
            gap: var(--spacing-lg);
          }

          .page-header__left {
            min-width: 0;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            padding: 16px 20px;
            border-radius: 14px;
          }

          .page-header__content {
            flex-direction: column;
            align-items: stretch;
          }

          .page-header__left {
            flex-direction: row;
            align-items: center;
            width: 100%;
            gap: 12px;
          }

          .page-header__icon-wrapper {
            width: 44px;
            height: 44px;
            font-size: 1.25rem;
            border-radius: 10px;
          }

          .page-header__title {
            font-size: 1.25rem;
          }

          .page-header__info {
            flex: 1;
            gap: 8px;
            min-width: 0;
          }

          .page-content {
            padding: 0 var(--spacing-lg) var(--spacing-lg);
          }

          .card__body {
            padding: var(--spacing-lg);
          }

          .overview-grid,
          .details-grid {
            grid-template-columns: 1fr;
          }

          .page-header__right {
            width: 100%;
            margin-top: 12px;
          }

          .btn--primary {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .page-header {
            padding: 14px 16px;
            border-radius: 12px;
          }

          .page-header__left {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .page-header__info {
            width: 100%;
          }

          .page-header__title {
            font-size: 1.125rem;
          }

          .page-header__badges {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
            width: 100%;
          }

          .course-code {
            width: 100%;
            justify-content: center;
          }

          .status-badge {
            width: 100%;
            justify-content: center;
          }

          .btn--primary {
            width: 100%;
            justify-content: center;
          }

          .overview-item,
          .detail-item {
            padding: var(--spacing-md);
          }
        }

        /* ================= BADGE VARIANTS ================= */
        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.375rem 0.75rem;
          font-size: 0.8125rem;
          font-weight: 600;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge-primary {
          background: rgba(26, 75, 109, 0.15);
          color: var(--brand-primary);
        }

        .badge-success {
          background: rgba(40, 167, 69, 0.15);
          color: var(--brand-success);
        }

        .badge-warning {
          background: rgba(255, 193, 7, 0.15);
          color: #b18904;
        }

        .badge-danger {
          background: rgba(220, 53, 69, 0.15);
          color: var(--brand-danger);
        }

        .badge-info {
          background: rgba(23, 162, 184, 0.15);
          color: var(--brand-info);
        }

        .badge-purple {
          background: rgba(111, 66, 193, 0.15);
          color: var(--brand-purple);
        }

        .badge-secondary {
          background: rgba(108, 117, 125, 0.15);
          color: var(--brand-secondary);
        }
      `}</style>
    </div>
  );
}

/* ================= OVERVIEW ITEM COMPONENT ================= */
const OverviewItem = ({ icon, label, value, variant = 'primary', isLink = false, onClick, badge = false }) => {
  const handleClick = () => {
    if (isLink && onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`overview-item ${isLink ? 'overview-item--clickable' : ''}`}
      onClick={handleClick}
      role={isLink ? 'button' : undefined}
      tabIndex={isLink ? 0 : undefined}
      onKeyDown={isLink ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="overview-item__icon">
        {icon}
      </div>
      <div className="overview-item__content">
        <div className="overview-item__label">{label}</div>
        <div className="overview-item__value">
          {badge ? (
            <span className={`badge badge-${variant}`}>{value}</span>
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
};

/* ================= DETAIL ITEM COMPONENT ================= */
const DetailItem = ({ icon, label, value, showCopy = false, onCopy }) => (
  <div className="detail-item">
    <div className="detail-item__header">
      <span className="detail-item__icon">{icon}</span>
      <span className="detail-item__label">{label}</span>
    </div>
    <div className="detail-item__value">{value}</div>
    {showCopy && typeof value === 'string' && (
      <button
        className="detail-item__copy-btn"
        onClick={onCopy}
        aria-label={`Copy ${label}`}
        title="Copy to clipboard"
      >
        <FaCopy />
      </button>
    )}
  </div>
);
