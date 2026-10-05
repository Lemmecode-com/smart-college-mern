import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import useRole from "../../../hooks/useRole";

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
  FaClipboardList,
  FaUniversity,
  FaCreditCard,
  FaBookOpen,
} from "react-icons/fa";

export default function ViewSubject() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { canEdit } = useRole();

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const AUTH_ERROR_CODES = new Set([
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
    "TOKEN_BLACKLISTED",
    "TOKEN_INVALIDATED",
    "USER_NOT_FOUND",
    "ACCOUNT_DEACTIVATED",
    "UNAUTHORIZED",
  ]);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN" && user.role !== "PRINCIPAL")
    return <Navigate to="/dashboard" replace />;

  /* ================= FETCH SUBJECT ================= */
  useEffect(() => {
    const fetchSubject = async () => {
      try {
        const res = await api.get(`/subjects/${id}`);
        setSubject(res.data);
      } catch (err) {
        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;
        const errorMessage = backendMessage || "Failed to load subject details.";

        logger.error("Error fetching subject:", statusCode, errorCode);

        setError({
          message: errorMessage,
          statusCode,
          errorCode,
        });
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
  if (error) {
    return (
      <ApiError
        title="Subject Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchSubject}
        onGoBack={() => navigate('/subjects')}
      />
    );
  }

  if (!subject) {
    return (
      <ApiError
        title="Subject Loading Error"
        message="Subject not found"
        statusCode={404}
        onGoBack={() => navigate('/subjects')}
      />
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
<PageHeader
  icon={FaBook}
  title={subject.name}
  subtitle={
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          background: "rgba(255, 255, 255, 0.15)",
          padding: "0.3rem 0.75rem",
          borderRadius: "8px",
          fontSize: "0.8rem",
          fontWeight: 600,
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        {subject.code}
      </span>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          padding: "0.3rem 0.75rem",
          borderRadius: "20px",
          fontSize: "0.75rem",
          fontWeight: 700,
          textTransform: "uppercase",
          background:
            subject.status?.toLowerCase() === "active"
              ? "rgba(76, 175, 80, 0.2)"
              : "rgba(158, 158, 158, 0.2)",
          color:
            subject.status?.toLowerCase() === "active"
              ? "#81c784"
              : "#bdbdbd",
          border:
            subject.status?.toLowerCase() === "active"
              ? "1px solid rgba(76, 175, 80, 0.3)"
              : "1px solid rgba(158, 158, 158, 0.3)",
        }}
      >
        <FaCheckCircle size={11} />
        {subject.status}
      </span>
    </div>
  }
  actions={
    <>
      <button
        type="button"
        onClick={() => navigate("/subjects")}
        aria-label="Back to Subjects"
        title="Back to Subjects"
        style={{
                    minHeight: "48px",
                    padding: "0 20px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",   
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow =
            "0 4px 10px rgba(0, 0, 0, 0.15)";
          e.currentTarget.style.background =
            "rgba(255, 255, 255, 0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.background =
            "rgba(255, 255, 255, 0.12)";
        }}
      >
        <FaArrowLeft size={15} />
        <span>Back to Subjects</span>
      </button>

      {canEdit("subjects") && (
        <button
          type="button"
          onClick={() => navigate(`/subjects/edit/${subject._id}`)}
          aria-label="Edit Subject"
          title="Edit Subject"
          style={{
                    minHeight: "48px",
                    padding: "0 20px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "12px",
                    background: "white",
                    color: "#0E3746",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",       
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 4px 10px rgba(0, 0, 0, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <FaEdit size={15} />
          <span>Edit Subject</span>
        </button>
      )}
    </>
  }
/>

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

        {/* EXAM / MARKS CONFIGURATION CARD */}
        <div className="info-card exam-config-card">
          <div className="card-header">
            <FaClipboardList className="card-header-icon" />
            <h3>Exam / Marks Configuration</h3>
          </div>
          <div className="card-body">
            {subject.subjectType ? (
              <div className="info-grid">
                <InfoItem
                  icon={<FaLayerGroup />}
                  label="Subject Type"
                  value={subject.subjectType}
                />

                {subject.subjectType === "THEORY" && (
                  <>
                    <InfoItem
                      icon={<FaBookOpen />}
                      label="Internal Max Marks"
                      value={subject.internalMaxMarks}
                    />
                    <InfoItem
                      icon={<FaUniversity />}
                      label="External Max Marks"
                      value={subject.externalMaxMarks}
                    />
                    <InfoItem
                      icon={<FaCreditCard />}
                      label="Internal Pass Marks"
                      value={subject.internalPassMarks}
                    />
                    <InfoItem
                      icon={<FaCreditCard />}
                      label="External Pass Marks"
                      value={subject.externalPassMarks}
                    />
                  </>
                )}

                {subject.subjectType === "PRACTICAL" && (
                  <>
                    <InfoItem
                      icon={<FaBookOpen />}
                      label="Applicable Maximum Marks"
                      value={subject.internalMaxMarks}
                    />
                    <InfoItem
                      icon={<FaCreditCard />}
                      label="Pass Marks"
                      value={subject.passMarks}
                    />
                  </>
                )}

                {subject.subjectType === "COMPOSITE" && (
                  <>
                    <InfoItem
                      icon={<FaBookOpen />}
                      label="Internal Max Marks"
                      value={subject.internalMaxMarks}
                    />
                    <InfoItem
                      icon={<FaUniversity />}
                      label="External Max Marks"
                      value={subject.externalMaxMarks}
                    />
                    <InfoItem
                      icon={<FaCreditCard />}
                      label="Pass Marks"
                      value={subject.passMarks}
                    />
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted mb-0">
                No exam / marks configuration set for this subject.
              </p>
            )}
          </div>
        </div>

        {/* TIMELINE CARD */}
        <div className="info-card timeline-card">
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
      </div>

      {/* STYLES */}
      <style>{`
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
        /* ================= MAIN GRID ================= */
        .view-subject-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
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
          grid-column: 1 / 3;
        }

        .exam-config-card {
          grid-column: 1 / 3;
          grid-row: 2;
        }

        .timeline-card {
          grid-column: 3;
          grid-row: 2;
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

          .timeline-card {
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
