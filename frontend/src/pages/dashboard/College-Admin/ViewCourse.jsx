import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBookOpen,
  FaLayerGroup,
  FaUsers,
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
  FaUserGraduate
} from "react-icons/fa";

export default function ViewCourse() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH COURSE ================= */
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        setCourse(res.data);
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
    return (
      <div className="course-detail-loading-container">
        <div className="course-detail-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h4>Loading course details...</h4>
      </div>
    );
  }

  /* ================= ERROR/NOT FOUND STATE ================= */
  if (error || !course) {
    return (
      <div className="course-detail-error-container">
        <div className="error-icon">
          <FaTimesCircle />
        </div>
        <h3>{error || "Course not found"}</h3>
        <button 
          className="course-detail-btn course-detail-btn--secondary"
          onClick={() => navigate('/courses')}
        >
          <FaArrowLeft /> Back to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="course-detail-container">
      {/* HEADER */}
      <div className="course-detail-header">
        <div className="header-left">
          <div className="course-detail-icon">
            <FaBookOpen />
          </div>
          <div>
            <h1>{course.name}</h1>
            <p className="course-code">{course.code}</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="course-detail-btn course-detail-btn--secondary"
            onClick={() => navigate('/courses')}
          >
            <FaArrowLeft /> Back to Courses
          </button>
          
          <button
            className="course-detail-btn course-detail-btn--primary"
            onClick={() => navigate(`/courses/edit/${course._id}`)}
          >
            <FaEdit /> Edit Course
          </button>
        </div>
      </div>

      {/* COURSE DETAILS CARD */}
      <div className="course-detail-card">
        <div className="detail-grid">
          <DetailItem icon={<FaTag />} label="Course Code">
            {course.code}
          </DetailItem>

          <DetailItem icon={<FaLayerGroup />} label="Program Level">
            {course.programLevel || "N/A"}
          </DetailItem>

          <DetailItem icon={<FaBuilding />} label="Department">
            {course.department_id?.name || "N/A"}
          </DetailItem>

          <DetailItem icon={<FaChalkboardTeacher />} label="Type">
            <span className={`type-badge type-${course.type?.toLowerCase()}`}>
              {course.type || "N/A"}
            </span>
          </DetailItem>

          <DetailItem icon={<FaUserGraduate />} label="Max Students">
            {course.maxStudents || "N/A"}
          </DetailItem>

          <DetailItem icon={<FaAward />} label="Credits">
            {course.credits || "N/A"}
          </DetailItem>

          <DetailItem icon={<FaClock />} label="Duration">
            {course.duration || "N/A"}
          </DetailItem>

          <DetailItem icon={<FaCalendarAlt />} label="Semester">
            {course.semester || "N/A"}
          </DetailItem>

          <DetailItem icon={<FaCheckCircle />} label="Status">
            <span className={`status-badge status-${course.status?.toLowerCase()}`}>
              {course.status || "N/A"}
            </span>
          </DetailItem>

          <DetailItem icon={<FaCalendarAlt />} label="Created At">
            {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : "N/A"}
          </DetailItem>

          <DetailItem icon={<FaCalendarAlt />} label="Updated At">
            {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : "N/A"}
          </DetailItem>
        </div>
      </div>
      <style jsx>{`
        .course-detail-container {
          padding: 2rem;
          background: #f5f7fa;
          min-height: 100vh;
        }

        .course-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .course-detail-icon {
          font-size: 2rem;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .course-detail-btn {
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .course-detail-btn--primary {
          background: #4caf50;
          color: white;
        }

        .course-detail-btn--secondary {
          background: white;
          color: #1a4b6d;
        }

        .course-detail-btn:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }

        .course-code {
          opacity: 0.85;
          margin: 0.25rem 0 0 0;
        }

        .course-detail-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          margin-bottom: 1.5rem;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .detail-item {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 12px;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .detail-item.full-row {
          grid-column: 1 / -1;
        }

        .detail-icon {
          font-size: 1.5rem;
          color: #1a4b6d;
          flex-shrink: 0;
          margin-top: 0.25rem;
        }

        .detail-label {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 0.25rem;
        }

        .detail-value {
          font-weight: 600;
          color: #1a4b6d;
          line-height: 1.5;
        }

        .status-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .status-active {
          background: rgba(76, 175, 80, 0.1);
          color: #4CAF50;
        }

        .status-inactive {
          background: rgba(158, 158, 158, 0.1);
          color: #9e9e9e;
        }

        .type-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .type-theory {
          background: rgba(33, 150, 243, 0.1);
          color: #2196F3;
        }

        .type-practical {
          background: rgba(255, 152, 0, 0.1);
          color: #FF9800;
        }

        .type-both {
          background: rgba(156, 39, 176, 0.1);
          color: #9C27B0;
        }

        .related-info-section {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .related-info-section h3 {
          margin-top: 0;
          color: #1a4b6d;
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .info-card {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
        }

        .info-card h4 {
          margin: 0 0 1rem 0;
          color: #1a4b6d;
          font-size: 1rem;
        }

        .info-value {
          font-size: 2rem;
          font-weight: 700;
          color: #1a4b6d;
          margin: 0.5rem 0;
        }

        .info-desc {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .course-detail-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
        }

        .course-detail-spinner {
          position: relative;
          width: 70px;
          height: 70px;
        }

        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 4px solid transparent;
          border-top-color: #1a4b6d;
          animation: spin 1s linear infinite;
        }

        .spinner-ring:nth-child(2) {
          border-top-color: #0f3a4a;
          animation-delay: 0.1s;
        }

        .spinner-ring:nth-child(3) {
          border-top-color: rgba(26, 75, 109, 0.5);
          animation-delay: 0.2s;
        }

        .course-detail-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          text-align: center;
        }

        .error-icon {
          font-size: 3rem;
          color: #F44336;
          margin-bottom: 1rem;
        }

        .course-detail-error-container h3 {
          color: #1a4b6d;
          margin-bottom: 1.5rem;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .course-detail-container {
            padding: 1rem;
          }

          .course-detail-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.25rem;
          }

          .header-actions {
            width: 100%;
            flex-direction: column;
          }

          .course-detail-btn {
            width: 100%;
            justify-content: center;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/* Reusable Detail Item Component */
const DetailItem = ({ icon, label, children, fullRow = false }) => (
  <div className={`detail-item ${fullRow ? 'full-row' : ''}`}>
    <div className="detail-icon">{icon}</div>
    <div>
      <div className="detail-label">{label}</div>
      <div className="detail-value">{children}</div>
    </div>
  </div>
);