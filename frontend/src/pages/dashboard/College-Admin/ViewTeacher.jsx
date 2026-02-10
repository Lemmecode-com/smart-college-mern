import { useContext, useEffect, useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUserTie,
  FaEnvelope,
  FaIdBadge,
  FaBriefcase,
  FaGraduationCap,
  FaClock,
  FaBuilding,
  FaCheckCircle,
  FaArrowLeft,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaVenusMars,
  FaTint,
  FaMapMarkerAlt,
  FaCity,
  FaSpinner,
  FaExclamationTriangle,
  FaSyncAlt,
  FaPhone,
  FaCalendarAlt,
  FaUsers,
  FaInfoCircle
} from "react-icons/fa";

export default function ViewTeacher() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (!["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role))
    return <Navigate to="/" />;

  /* ================= FETCH TEACHER ================= */
  const fetchTeacher = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/teachers/${id}`);
      setTeacher(res.data);
      setRetryCount(0);
    } catch (err) {
      console.error("Teacher fetch error:", err);
      setError(err.response?.data?.message || "Failed to load teacher profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacher();
  }, [id]);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchTeacher();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  };

  /* ================= LOADING SKELETON ================= */
  const renderSkeleton = () => (
    <div className="erp-skeleton-container">
      <div className="skeleton-header">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-text skeleton-title"></div>
        <div className="skeleton-text skeleton-subtitle"></div>
      </div>
      
      <div className="skeleton-section">
        <div className="skeleton-section-title"></div>
        <div className="skeleton-table">
          <div className="skeleton-table-header">
            <div className="skeleton-header-cell"></div>
            <div className="skeleton-header-cell"></div>
          </div>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton-table-row">
              <div className="skeleton-cell skeleton-label"></div>
              <div className="skeleton-cell skeleton-value"></div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="skeleton-section">
        <div className="skeleton-section-title"></div>
        <div className="skeleton-table">
          <div className="skeleton-table-header">
            <div className="skeleton-header-cell"></div>
            <div className="skeleton-header-cell"></div>
            <div className="skeleton-header-cell"></div>
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-table-row">
              <div className="skeleton-cell skeleton-doc-icon"></div>
              <div className="skeleton-cell skeleton-doc-name"></div>
              <div className="skeleton-cell skeleton-doc-meta"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <div className="erp-error-container">
        <div className="erp-error-icon">
          <FaExclamationTriangle />
        </div>
        <h3>Teacher Profile Error</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button 
            className="erp-btn erp-btn-secondary" 
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="erp-btn-icon" />
            Go Back
          </button>
          <button 
            className="erp-btn erp-btn-primary" 
            onClick={handleRetry}
            disabled={retryCount >= 3}
          >
            <FaSyncAlt className="erp-btn-icon" />
            {retryCount >= 3 ? "Max Retries" : `Retry (${retryCount}/3)`}
          </button>
        </div>
      </div>
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading || !teacher) {
    return (
      <div className="erp-loading-container">
        <div className="erp-loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h4 className="erp-loading-text">Loading teacher profile...</h4>
        <div className="loading-progress">
          <div className="progress-bar"></div>
        </div>
        {renderSkeleton()}
      </div>
    );
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item"><a href="/teachers">Teachers</a></li>
          <li className="breadcrumb-item active" aria-current="page">{teacher.name}</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaUserTie />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Teacher Profile</h1>
            <p className="erp-page-subtitle">
              Complete faculty information and academic details
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="erp-btn-icon" />
            <span>Back to Teachers</span>
          </button>
        </div>
      </div>

      {/* PROFILE BANNER */}
      <div className="profile-banner animate-fade-in">
        <div className="profile-banner-avatar">
          {teacher.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-banner-info">
          <h2 className="profile-banner-name">{teacher.name}</h2>
          <div className="profile-banner-meta">
            <span className="profile-banner-designation">
              <FaBriefcase className="meta-icon" />
              {teacher.designation || "Faculty Member"}
            </span>
            <span className="profile-banner-id">
              <FaIdBadge className="meta-icon" />
              {teacher.employeeId || "N/A"}
            </span>
            <span className={`profile-banner-status status-${teacher.status?.toLowerCase() || 'inactive'}`}>
              <FaCheckCircle className="status-icon" />
              {teacher.status || "INACTIVE"}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="main-content-grid animate-fade-in">
        {/* LEFT COLUMN - PROFESSIONAL DETAILS */}
        <div className="left-column">
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaBriefcase className="erp-card-icon" />
                Professional Details
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="erp-table-container">
                <table className="erp-detail-table">
                  <tbody>
                    <DetailRow 
                      label="Employee ID" 
                      value={teacher.employeeId || "N/A"} 
                      icon={<FaIdBadge />}
                    />
                    <DetailRow 
                      label="Email Address" 
                      value={teacher.email || "N/A"} 
                      icon={<FaEnvelope />}
                      isEmail={true}
                    />
                    <DetailRow 
                      label="Designation" 
                      value={teacher.designation || "N/A"} 
                      icon={<FaBriefcase />}
                    />
                    <DetailRow 
                      label="Qualification" 
                      value={teacher.qualification || "N/A"} 
                      icon={<FaGraduationCap />}
                    />
                    <DetailRow 
                      label="Experience" 
                      value={`${teacher.experienceYears || 0} Years`} 
                      icon={<FaClock />}
                    />
                    <DetailRow 
                      label="Department" 
                      value={teacher.department?.name || "N/A"} 
                      icon={<FaBuilding />}
                    />
                    <DetailRow 
                      label="Employment Type" 
                      value={teacher.employmentType?.replace('_', ' ') || "FULL TIME"} 
                      icon={<FaUsers />}
                    />
                    <DetailRow 
                      label="Assigned Subjects" 
                      value={teacher.subjects?.length?.toString() || "0"} 
                      icon={<FaGraduationCap />}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - PERSONAL & CONTACT DETAILS */}
        <div className="right-column">
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaUserTie className="erp-card-icon" />
                Personal Information
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="erp-table-container">
                <table className="erp-detail-table">
                  <tbody>
                    <DetailRow 
                      label="Gender" 
                      value={teacher.gender || "N/A"} 
                      icon={<FaVenusMars />}
                    />
                    <DetailRow 
                      label="Blood Group" 
                      value={teacher.bloodGroup || "N/A"} 
                      icon={<FaTint />}
                    />
                    <DetailRow 
                      label="Contact Number" 
                      value={teacher.contactNumber || "N/A"} 
                      icon={<FaPhone />}
                    />
                    <DetailRow 
                      label="Address" 
                      value={teacher.address || "N/A"} 
                      icon={<FaMapMarkerAlt />}
                      isMultiline={true}
                    />
                    <DetailRow 
                      label="City" 
                      value={teacher.city || "N/A"} 
                      icon={<FaCity />}
                    />
                    <DetailRow 
                      label="State" 
                      value={teacher.state || "N/A"} 
                      icon={<FaBuilding />}
                    />
                    <DetailRow 
                      label="Joined On" 
                      value={new Date(teacher.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })} 
                      icon={<FaCalendarAlt />}
                    />
                    <DetailRow 
                      label="Last Updated" 
                      value={new Date(teacher.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })} 
                      icon={<FaClock />}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* DOCUMENTS SECTION */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaFileAlt className="erp-card-icon" />
                Uploaded Documents
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="erp-table-container">
                <table className="erp-documents-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Type</th>
                      <th>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    <DocumentRow 
                      title="Aadhar Card" 
                      icon={<FaFilePdf />} 
                      type="PDF" 
                      size="245 KB" 
                    />
                    <DocumentRow 
                      title="PAN Card" 
                      icon={<FaFilePdf />} 
                      type="PDF" 
                      size="189 KB" 
                    />
                    <DocumentRow 
                      title="Degree Certificate" 
                      icon={<FaFileImage />} 
                      type="JPG" 
                      size="1.2 MB" 
                    />
                    <DocumentRow 
                      title="Passport Photo" 
                      icon={<FaUserTie />} 
                      type="PNG" 
                      size="320 KB" 
                    />
                  </tbody>
                </table>
              </div>
              <div className="documents-note">
                <FaInfoCircle className="note-icon" />
                <span>Note: Document previews require backend integration. Contact system administrator for access.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STYLES */}
      <style jsx>{`
        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
          animation: fadeIn 0.6s ease;
        }
        
        .erp-breadcrumb {
          background: transparent;
          padding: 0;
          margin-bottom: 1.5rem;
        }
        
        .breadcrumb {
          background: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .breadcrumb-item a {
          color: #1a4b6d;
          text-decoration: none;
        }
        
        .breadcrumb-item a:hover {
          text-decoration: underline;
        }
        
        .erp-page-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(26, 75, 109, 0.3);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideDown 0.6s ease;
        }
        
        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        
        .erp-header-icon {
          width: 56px;
          height: 56px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
        }
        
        .erp-page-title {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
        }
        
        .erp-page-subtitle {
          margin: 0.375rem 0 0 0;
          opacity: 0.85;
          font-size: 1rem;
        }
        
        .erp-header-actions .erp-btn {
          background: white;
          color: #1a4b6d;
          border: none;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }
        
        .erp-header-actions .erp-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        }
        
        /* PROFILE BANNER */
        .profile-banner {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 2rem;
          box-shadow: 0 8px 32px rgba(26, 75, 109, 0.3);
          color: white;
          animation: slideUp 0.6s ease;
        }
        
        .profile-banner-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }
        
        .profile-banner-info {
          flex: 1;
        }
        
        .profile-banner-name {
          font-size: 2rem;
          font-weight: 800;
          margin: 0 0 0.75rem 0;
          letter-spacing: -0.5px;
        }
        
        .profile-banner-meta {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        
        .profile-banner-designation,
        .profile-banner-id {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.15);
          padding: 0.375rem 1rem;
          border-radius: 50px;
          font-weight: 600;
        }
        
        .meta-icon {
          font-size: 0.9rem;
        }
        
        .profile-banner-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 1rem;
          border-radius: 50px;
          font-weight: 600;
        }
        
        .status-active {
          background: rgba(76, 175, 80, 0.25);
          color: #4CAF50;
        }
        
        .status-inactive {
          background: rgba(158, 158, 158, 0.25);
          color: #9e9e9e;
        }
        
        .status-icon {
          font-size: 0.85rem;
        }
        
        /* MAIN CONTENT GRID */
        .main-content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }
        
        .left-column,
        .right-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          animation: fadeIn 0.6s ease;
        }
        
        .erp-card-header {
          padding: 1.5rem 1.75rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #e9ecef;
        }
        
        .erp-card-header h3 {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
          color: #1a4b6d;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .erp-card-icon {
          color: #1a4b6d;
          font-size: 1.25rem;
        }
        
        .erp-card-body {
          padding: 0;
        }
        
        .erp-table-container {
          overflow-x: auto;
        }
        
        /* DETAIL TABLE */
        .erp-detail-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .erp-detail-table tbody tr {
          border-bottom: 1px solid #f0f2f5;
        }
        
        .erp-detail-table tbody tr:last-child {
          border-bottom: none;
        }
        
        .erp-detail-table tbody tr:hover {
          background: #f8f9ff;
        }
        
        .detail-row {
          display: grid;
          grid-template-columns: 200px 1fr;
          padding: 1rem 1.75rem;
          transition: all 0.2s ease;
        }
        
        .detail-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.95rem;
        }
        
        .detail-label-icon {
          color: #1a4b6d;
          font-size: 1.1rem;
          width: 20px;
          display: inline-flex;
          justify-content: center;
        }
        
        .detail-value {
          color: #1a4b6d;
          font-weight: 600;
          font-size: 1rem;
          word-break: break-word;
        }
        
        .detail-value.email {
          color: #1976d2;
          text-decoration: underline;
          cursor: pointer;
        }
        
        .detail-value.multiline {
          white-space: pre-line;
          line-height: 1.5;
        }
        
        /* DOCUMENTS TABLE */
        .erp-documents-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .erp-documents-table thead {
          background: #f8f9fa;
          border-bottom: 2px solid #e9ecef;
        }
        
        .erp-documents-table th {
          padding: 1rem 1.75rem;
          text-align: left;
          font-weight: 700;
          color: #1a4b6d;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .erp-documents-table tbody tr {
          border-bottom: 1px solid #f0f2f5;
        }
        
        .erp-documents-table tbody tr:last-child {
          border-bottom: none;
        }
        
        .erp-documents-table tbody tr:hover {
          background: #f8f9ff;
        }
        
        .erp-documents-table td {
          padding: 1rem 1.75rem;
          color: #2c3e50;
          font-weight: 500;
        }
        
        .doc-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
        }
        
        .doc-name {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          color: #1a4b6d;
        }
        
        .doc-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        
        .doc-type {
          background: #e3f2fd;
          color: #1976d2;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.85rem;
          display: inline-block;
          width: fit-content;
        }
        
        .doc-size {
          color: #6c757d;
          font-size: 0.9rem;
        }
        
        .documents-note {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1.75rem;
          background: #e3f2fd;
          border-radius: 0 0 16px 16px;
          border-left: 4px solid #2196F3;
          font-size: 0.9rem;
          color: #1a4b6d;
          margin-top: 1rem;
        }
        
        .note-icon {
          font-size: 1.25rem;
          margin-top: 0.125rem;
          flex-shrink: 0;
        }
        
        /* SKELETON LOADING */
        .erp-skeleton-container {
          padding: 2rem;
        }
        
        .skeleton-header {
          display: flex;
          align-items: center;
          gap: 2rem;
          margin-bottom: 2.5rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e9ecef;
        }
        
        .skeleton-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: #f0f2f5;
          position: relative;
          overflow: hidden;
        }
        
        .skeleton-avatar::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: skeleton-loading 1.5s infinite;
        }
        
        .skeleton-text {
          height: 24px;
          background: #f0f2f5;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
          margin-bottom: 0.75rem;
        }
        
        .skeleton-text::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: skeleton-loading 1.5s infinite;
        }
        
        .skeleton-title {
          width: 300px;
          height: 32px;
        }
        
        .skeleton-subtitle {
          width: 200px;
        }
        
        .skeleton-section {
          margin-bottom: 2.5rem;
        }
        
        .skeleton-section-title {
          height: 28px;
          background: #f0f2f5;
          border-radius: 8px;
          width: 200px;
          margin-bottom: 1.5rem;
          position: relative;
          overflow: hidden;
        }
        
        .skeleton-section-title::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: skeleton-loading 1.5s infinite;
        }
        
        .skeleton-table {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .skeleton-table-header {
          display: grid;
          grid-template-columns: 200px 1fr;
          background: #f8f9fa;
          border-bottom: 2px solid #e9ecef;
        }
        
        .skeleton-header-cell {
          height: 40px;
          background: #e9ecef;
        }
        
        .skeleton-table-row {
          display: grid;
          grid-template-columns: 200px 1fr;
          border-bottom: 1px solid #f0f2f5;
          padding: 1rem 1.75rem;
        }
        
        .skeleton-cell {
          height: 20px;
          background: #f0f2f5;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }
        
        .skeleton-cell::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: skeleton-loading 1.5s infinite;
        }
        
        .skeleton-label {
          width: 70%;
        }
        
        .skeleton-value {
          width: 60%;
        }
        
        .skeleton-doc-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
        }
        
        .skeleton-doc-name {
          width: 80%;
        }
        
        .skeleton-doc-meta {
          width: 50%;
        }
        
        @keyframes skeleton-loading {
          to { left: 100%; }
        }
        
        /* ERROR CONTAINER */
        .erp-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin: 2rem;
        }
        
        .erp-error-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(244, 67, 54, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: #F44336;
          font-size: 3rem;
        }
        
        .erp-error-container h3 {
          font-size: 1.8rem;
          color: #1a4b6d;
          margin-bottom: 1rem;
        }
        
        .erp-error-container p {
          color: #666;
          font-size: 1.1rem;
          max-width: 600px;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }
        
        .error-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        /* LOADING CONTAINER */
        .erp-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 2rem;
          position: relative;
        }
        
        .erp-loading-spinner {
          position: relative;
          width: 80px;
          height: 80px;
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
        
        .erp-loading-text {
          font-size: 1.35rem;
          font-weight: 600;
          color: #1a4b6d;
        }
        
        .loading-progress {
          width: 250px;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-top: -1rem;
        }
        
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #1a4b6d 0%, #0f3a4a 100%);
          width: 35%;
          animation: progressPulse 1.8s ease-in-out infinite;
        }
        
        /* ANIMATIONS */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes progressPulse {
          0%, 100% { width: 35%; }
          50% { width: 65%; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 1024px) {
          .main-content-grid {
            grid-template-columns: 1fr;
          }
          
          .profile-banner {
            flex-direction: column;
            text-align: center;
            padding: 1.75rem;
          }
          
          .profile-banner-avatar {
            width: 80px;
            height: 80px;
            font-size: 2rem;
          }
          
          .profile-banner-meta {
            justify-content: center;
            gap: 1rem;
          }
          
          .profile-banner-name {
            font-size: 1.75rem;
          }
        }
        
        @media (max-width: 768px) {
          .erp-container {
            padding: 1rem;
          }
          
          .erp-page-header {
            padding: 1.5rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .erp-header-actions {
            width: 100%;
            margin-top: 0.5rem;
          }
          
          .erp-header-actions .erp-btn {
            width: 100%;
            justify-content: center;
          }
          
          .profile-banner {
            padding: 1.5rem;
          }
          
          .detail-row {
            grid-template-columns: 150px 1fr;
            padding: 0.875rem 1.25rem;
          }
          
          .erp-documents-table th,
          .erp-documents-table td {
            padding: 0.875rem 1.25rem;
            font-size: 0.9rem;
          }
          
          .doc-row {
            grid-template-columns: 1.5fr 1fr 0.75fr;
          }
          
          .erp-skeleton-container {
            padding: 1rem;
          }
          
          .skeleton-header {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }
          
          .skeleton-table-header,
          .skeleton-table-row {
            grid-template-columns: 150px 1fr;
          }
        }
        
        @media (max-width: 480px) {
          .detail-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
          
          .detail-label {
            font-size: 0.9rem;
          }
          
          .detail-value {
            font-size: 0.95rem;
          }
          
          .erp-card-header h3 {
            font-size: 1.25rem;
          }
          
          .erp-card-header .erp-card-icon {
            font-size: 1.1rem;
          }
          
          .doc-row {
            grid-template-columns: 1fr;
          }
          
          .erp-documents-table thead {
            display: none;
          }
          
          .erp-documents-table tbody tr {
            display: block;
            margin-bottom: 1rem;
            border: 1px solid #f0f2f5;
            border-radius: 8px;
          }
          
          .erp-documents-table td {
            display: block;
            padding: 0.75rem 1rem;
          }
          
          .erp-documents-table td:first-child::before {
            content: "Document: ";
            font-weight: 600;
            color: #1a4b6d;
          }
          
          .erp-documents-table td:nth-child(2)::before {
            content: "Type: ";
            font-weight: 600;
            color: #1a4b6d;
          }
          
          .erp-documents-table td:nth-child(3)::before {
            content: "Size: ";
            font-weight: 600;
            color: #1a4b6d;
          }
        }
      `}</style>
    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */
function DetailRow({ label, value, icon, isEmail = false, isMultiline = false }) {
  return (
    <tr className="detail-row">
      <td className="detail-label">
        <span className="detail-label-icon">{icon}</span>
        {label}
      </td>
      <td className={`detail-value ${isEmail ? 'email' : ''} ${isMultiline ? 'multiline' : ''}`}>
        {value}
      </td>
    </tr>
  );
}

function DocumentRow({ title, icon, type, size }) {
  return (
    <tr className="doc-row">
      <td className="doc-name">
        <span className="doc-icon">{icon}</span>
        {title}
      </td>
      <td>
        <span className="doc-type">{type}</span>
      </td>
      <td className="doc-size">{size}</td>
    </tr>
  );
}