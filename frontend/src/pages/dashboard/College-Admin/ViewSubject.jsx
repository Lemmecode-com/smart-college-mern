import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import {
  FaBook,
  FaArrowLeft,
  FaEdit,
  FaGraduationCap,
  FaClock,
  FaAward,
  FaUserTie,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaSpinner
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
    return (
      <div className="erp-loading-container">
        <FaSpinner className="spin-icon" />
        <h4>Loading subject details...</h4>
      </div>
    );
  }

  /* ================= ERROR ================= */
  if (error || !subject) {
    return (
      <div className="erp-error-container">
        <h3>{error || "Subject not found"}</h3>
        <button className="erp-btn" onClick={() => navigate('/subjects/course/' + (subject?.course_id?._id || subject?.course_id))}>
          <FaArrowLeft /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="erp-container">
      {/* HEADER */}
      <div className="erp-page-header">
        <div className="header-left">
          <FaBook className="header-icon" />
          <div>
            <h2>{subject.name}</h2>
            <p>{subject.code}</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="erp-btn secondary"
            onClick={() => navigate('/subjects/course/' + (subject.course_id?._id || subject.course_id))}
          >
            <FaArrowLeft /> Back
          </button>

          <button
            className="erp-btn primary"
            onClick={() => navigate(`/subjects/edit/${subject._id}`)}
          >
            <FaEdit /> Edit
          </button>
        </div>
      </div>

      {/* DETAILS CARD */}
      <div className="erp-card">
        <div className="detail-grid">

          <DetailItem icon={<FaGraduationCap />} label="Course">
            {subject.course_id?.name} ({subject.course_id?.code})
          </DetailItem>

          <DetailItem icon={<FaClock />} label="Semester">
            Semester {subject.semester}
          </DetailItem>

          <DetailItem icon={<FaAward />} label="Credits">
            {subject.credits}
          </DetailItem>

          <DetailItem icon={<FaUserTie />} label="Teacher">
            {subject.teacher_id?.name} ({subject.teacher_id?.designation})
          </DetailItem>

          <DetailItem icon={<FaCheckCircle />} label="Status">
            <span className={`status ${subject.status?.toLowerCase()}`}>
              {subject.status}
            </span>
          </DetailItem>

          <DetailItem icon={<FaCalendarAlt />} label="Created At">
            {new Date(subject.createdAt).toLocaleString()}
          </DetailItem>

          <DetailItem icon={<FaCalendarAlt />} label="Updated At">
            {new Date(subject.updatedAt).toLocaleString()}
          </DetailItem>

        </div>
      </div>

      {/* STYLES */}
      <style jsx>{`
        .erp-container {
          padding: 2rem;
          background: #f5f7fa;
          min-height: 100vh;
        }

        .erp-page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #1a4b6d, #0f3a4a);
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

        .header-icon {
          font-size: 2rem;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .erp-btn {
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .primary {
          background: #4caf50;
          color: white;
        }

        .secondary {
          background: white;
          color: #1a4b6d;
        }

        .erp-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
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
          align-items: center;
        }

        .detail-icon {
          font-size: 1.5rem;
          color: #1a4b6d;
        }

        .detail-label {
          font-size: 0.9rem;
          color: #666;
        }

        .detail-value {
          font-weight: 600;
          color: #1a4b6d;
        }

        .status.active {
          color: green;
          font-weight: 700;
        }

        .status.inactive {
          color: gray;
          font-weight: 700;
        }

        .erp-loading-container,
        .erp-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
        }

        .spin-icon {
          font-size: 2rem;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* Reusable Detail Item */
const DetailItem = ({ icon, label, children }) => (
  <div className="detail-item">
    <div className="detail-icon">{icon}</div>
    <div>
      <div className="detail-label">{label}</div>
      <div className="detail-value">{children}</div>
    </div>
  </div>
);