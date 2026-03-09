import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";

import {
  FaBook,
  FaArrowLeft,
  FaEdit,
  FaGraduationCap,
  FaClock,
  FaAward,
  FaUserTie,
  FaCalendarAlt,
  FaCheckCircle,
  FaInfoCircle,
  FaLayerGroup,
  FaFileAlt,
  FaCopy
} from "react-icons/fa";

export default function ViewSubject() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH SUBJECT ================= */
  useEffect(() => {
    const fetchSubject = async () => {
      try {
        const res = await api.get(`/subjects/${id}`);
        setSubject(res.data);
      } catch (err) {
        setError("Failed to load subject details.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubject();
  }, [id]);

  /* ================= LOADING ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading subject details..." />;
  }

  /* ================= ERROR ================= */
  if (error || !subject) {
    return (
      <div className="erp-error-container">
        <div className="error-icon">
          <FaInfoCircle />
        </div>
        <h3>{error || "Subject not found"}</h3>
        <button 
          className="erp-btn erp-btn-primary" 
          onClick={() => navigate('/subjects/course/' + (subject?.course_id?._id || subject?.course_id))}
        >
          <FaArrowLeft /> Go Back
        </button>
      </div>
    );
  }

  const coursePath = subject.course_id?._id || subject.course_id;

  return (
    <div className="view-subject-container">
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Subjects", path: "/subjects" },
          { label: subject.name }
        ]}
      />

      {/* HEADER */}
      <div className="view-subject-header">
        <div className="header-content">
          <div className="header-icon-wrapper">
            <FaBook className="header-icon" />
          </div>
          <div className="header-text">
            <h1 className="subject-title">{subject.name}</h1>
            <div className="subject-meta">
              <span className="subject-code">{subject.code}</span>
              <span className={`status-badge status-${subject.status?.toLowerCase()}`}>
                <FaCheckCircle className="status-icon" />
                {subject.status}
              </span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate(`/subjects/course/${coursePath}`)}
          >
            <FaArrowLeft /> <span>Back to Subjects</span>
          </button>

          <button
            className="erp-btn erp-btn-primary"
            onClick={() => navigate(`/subjects/edit/${subject._id}`)}
          >
            <FaEdit /> <span>Edit Subject</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="view-subject-grid">
        {/* SUBJECT INFORMATION CARD */}
        <div className="info-card main-card">
          <div className="card-header">
            <FaInfoCircle className="card-header-icon" />
            <h3>Subject Information</h3>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <InfoItem 
                icon={<FaGraduationCap />} 
                label="Course" 
                value={subject.course_id?.name || "N/A"} 
                subValue={subject.course_id?.code}
              />

              <InfoItem 
                icon={<FaClock />} 
                label="Semester" 
                value={`Semester ${subject.semester}`}
              />

              <InfoItem 
                icon={<FaAward />} 
                label="Credits" 
                value={`${subject.credits} Credits`}
              />

              <InfoItem 
                icon={<FaLayerGroup />} 
                label="Department" 
                value={subject.department_id?.name || "N/A"}
                subValue={subject.department_id?.code}
              />
            </div>
          </div>
        </div>

        {/* TEACHER INFORMATION CARD */}
        <div className="info-card">
          <div className="card-header">
            <FaUserTie className="card-header-icon" />
            <h3>Assigned Teacher</h3>
          </div>
          <div className="card-body">
            {subject.teacher_id ? (
              <div className="teacher-card">
                <div className="teacher-avatar">
                  {subject.teacher_id.name.charAt(0).toUpperCase()}
                </div>
                <div className="teacher-info">
                  <div className="teacher-name">{subject.teacher_id.name}</div>
                  <div className="teacher-designation">{subject.teacher_id.designation || "Faculty"}</div>
                  {subject.teacher_id.email && (
                    <div className="teacher-email">{subject.teacher_id.email}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="no-teacher">
                <FaUserTie className="no-teacher-icon" />
                <p>No teacher assigned yet</p>
              </div>
            )}
          </div>
        </div>

        {/* TIMELINE CARD */}
        <div className="info-card">
          <div className="card-header">
            <FaCalendarAlt className="card-header-icon" />
            <h3>Timeline</h3>
          </div>
          <div className="card-body">
            <div className="timeline-grid">
              <TimelineItem 
                icon={<FaCalendarAlt />} 
                label="Created" 
                date={subject.createdAt}
              />

              <TimelineItem 
                icon={<FaCalendarAlt />} 
                label="Last Updated" 
                date={subject.updatedAt}
              />
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS CARD */}
        <div className="info-card">
          <div className="card-header">
            <FaFileAlt className="card-header-icon" />
            <h3>Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="quick-actions">
              <button 
                className="action-btn"
                onClick={() => navigator.clipboard.writeText(subject.code)}
              >
                <FaCopy className="action-icon" />
                <span>Copy Subject Code</span>
              </button>

              <button 
                className="action-btn"
                onClick={() => navigate(`/subjects/edit/${subject._id}`)}
              >
                <FaEdit className="action-icon" />
                <span>Edit Details</span>
              </button>

              <button 
                className="action-btn"
                onClick={() => navigate(`/subjects/course/${coursePath}`)}
              >
                <FaBook className="action-icon" />
                <span>View All Subjects</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STYLES */}
      <style jsx>{`
        /* ================= CSS VARIABLES ================= */
        :root {
          --sidebar-primary: #0f3a4a;
          --sidebar-secondary: #0c2d3a;
          --sidebar-accent: #3db5e6;
          --sidebar-accent-light: #4fc3f7;
          --sidebar-text: #e6f2f5;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --error-color: #ef4444;
          --card-shadow: 0 4px 20px rgba(15, 58, 74, 0.08);
          --card-hover-shadow: 0 8px 30px rgba(15, 58, 74, 0.12);
        }

        /* ================= CONTAINER ================= */
        .view-subject-container {
          padding: 1.5rem;
          background: linear-gradient(180deg, #f0f4f8 0%, #e8eef5 100%);
          min-height: 100vh;
          animation: fadeIn 0.6s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ================= HEADER ================= */
        .view-subject-header {
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 50%, #3db5e6 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(15, 58, 74, 0.4);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideDown 0.6s ease;
          position: relative;
          overflow: hidden;
        }

        .view-subject-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, rgba(61, 181, 230, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          position: relative;
          z-index: 1;
        }

        .header-icon-wrapper {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.25) 0%, rgba(79, 195, 247, 0.15) 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .header-icon {
          color: white;
        }

        .subject-title {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          color: white;
        }

        .subject-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .subject-code {
          background: rgba(255, 255, 255, 0.15);
          padding: 0.375rem 0.875rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-active {
          background: rgba(76, 175, 80, 0.2);
          color: #81c784;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .status-inactive {
          background: rgba(158, 158, 158, 0.2);
          color: #bdbdbd;
          border: 1px solid rgba(158, 158, 158, 0.3);
        }

        .status-icon {
          font-size: 0.75rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          position: relative;
          z-index: 1;
        }

        .erp-btn {
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 0.9375rem;
        }

        .erp-btn-primary {
          background: linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.4);
        }

        .erp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(61, 181, 230, 0.5);
        }

        .erp-btn-secondary {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
        }

        .erp-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }

        /* ================= MAIN GRID ================= */
        .view-subject-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        /* ================= INFO CARD ================= */
        .info-card {
          background: white;
          border-radius: 16px;
          box-shadow: var(--card-shadow);
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid rgba(15, 58, 74, 0.08);
        }

        .info-card:hover {
          box-shadow: var(--card-hover-shadow);
          transform: translateY(-2px);
        }

        .main-card {
          grid-column: 1 / 2;
        }

        .card-header {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%);
          border-bottom: 2px solid rgba(61, 181, 230, 0.15);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .card-header-icon {
          color: #3db5e6;
          font-size: 1.125rem;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #0f3a4a;
        }

        .card-body {
          padding: 1.5rem;
        }

        /* ================= INFO GRID ================= */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        .info-item {
          background: linear-gradient(135deg, #f8f9fa 0%, #f0f4f8 100%);
          padding: 1.25rem;
          border-radius: 12px;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          transition: all 0.3s ease;
          border: 1px solid rgba(61, 181, 230, 0.1);
        }

        .info-item:hover {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.05) 0%, rgba(79, 195, 247, 0.05) 100%);
          border-color: rgba(61, 181, 230, 0.25);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.1);
        }

        .info-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.125rem;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        .info-content {
          flex: 1;
          min-width: 0;
        }

        .info-label {
          font-size: 0.8125rem;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 0.375rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 1rem;
          font-weight: 600;
          color: #0f3a4a;
          line-height: 1.4;
        }

        .info-subvalue {
          font-size: 0.8125rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        /* ================= TEACHER CARD ================= */
        .teacher-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.05) 0%, rgba(79, 195, 247, 0.05) 100%);
          border-radius: 12px;
          border: 1px solid rgba(61, 181, 230, 0.15);
        }

        .teacher-avatar {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.3);
        }

        .teacher-info {
          flex: 1;
          min-width: 0;
        }

        .teacher-name {
          font-size: 1rem;
          font-weight: 700;
          color: #0f3a4a;
          margin-bottom: 0.25rem;
        }

        .teacher-designation {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .teacher-email {
          font-size: 0.8125rem;
          color: #3db5e6;
        }

        .no-teacher {
          text-align: center;
          padding: 2rem 1rem;
          color: #9ca3af;
        }

        .no-teacher-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .no-teacher p {
          margin: 0;
          font-size: 0.9375rem;
        }

        /* ================= TIMELINE GRID ================= */
        .timeline-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .timeline-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #f0f4f8 100%);
          border-radius: 12px;
          border: 1px solid rgba(61, 181, 230, 0.1);
          transition: all 0.3s ease;
        }

        .timeline-item:hover {
          border-color: rgba(61, 181, 230, 0.25);
          transform: translateX(4px);
        }

        .timeline-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.15) 0%, rgba(79, 195, 247, 0.1) 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3db5e6;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .timeline-content {
          flex: 1;
        }

        .timeline-label {
          font-size: 0.8125rem;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .timeline-date {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0f3a4a;
        }

        /* ================= QUICK ACTIONS ================= */
        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: white;
          border: 2px solid #e0e8f0;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0f3a4a;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          text-align: left;
        }

        .action-btn:hover {
          border-color: #3db5e6;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.05) 0%, rgba(79, 195, 247, 0.05) 100%);
          transform: translateX(4px);
        }

        .action-icon {
          color: #3db5e6;
          font-size: 1rem;
          width: 20px;
          text-align: center;
        }

        /* ================= ERROR CONTAINER ================= */
        .erp-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          padding: 2rem;
          text-align: center;
        }

        .error-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          font-size: 2.5rem;
          margin-bottom: 1.5rem;
        }

        .erp-error-container h3 {
          font-size: 1.5rem;
          color: #1f2937;
          margin-bottom: 1.5rem;
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 1024px) {
          .view-subject-grid {
            grid-template-columns: 1fr;
          }

          .main-card {
            grid-column: 1 / 2;
          }
        }

        @media (max-width: 768px) {
          .view-subject-container {
            padding: 1rem;
          }

          .view-subject-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.25rem;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            flex-direction: column;
          }

          .erp-btn {
            width: 100%;
            justify-content: center;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .subject-title {
            font-size: 1.375rem;
          }

          .header-icon-wrapper {
            width: 56px;
            height: 56px;
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

/* ================= REUSABLE INFO ITEM ================= */
const InfoItem = ({ icon, label, value, subValue }) => (
  <div className="info-item">
    <div className="info-icon">{icon}</div>
    <div className="info-content">
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
      {subValue && <div className="info-subvalue">{subValue}</div>}
    </div>
  </div>
);

/* ================= REUSABLE TIMELINE ITEM ================= */
const TimelineItem = ({ icon, label, date }) => (
  <div className="timeline-item">
    <div className="timeline-icon">{icon}</div>
    <div className="timeline-content">
      <div className="timeline-label">{label}</div>
      <div className="timeline-date">{new Date(date).toLocaleString()}</div>
    </div>
  </div>
);
