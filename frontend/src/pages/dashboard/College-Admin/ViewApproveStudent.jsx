import { useContext, useEffect, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import {
  FaUserGraduate,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUniversity,
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaRupeeSign,
  FaExclamationTriangle,
  FaSyncAlt,
  FaSpinner,
  FaInfoCircle,
  FaGraduationCap,
  FaBuilding,
  FaBookOpen,
  FaCreditCard,
  FaHistory,
  FaShieldAlt,
  FaDownload,
  FaUser,
  FaFileAlt,
  FaImage
} from "react-icons/fa";

export default function ViewApproveStudent() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH STUDENT ================= */
  const fetchStudent = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/students/approved-stud/${id}`);
      setStudent(res.data);
      setRetryCount(0);
    } catch (err) {
      console.error("Student fetch error:", err);
      setError(err.response?.data?.message || "Failed to load approved student. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [id]);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchStudent();
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
        <div className="skeleton-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-icon"></div>
              <div className="skeleton-label"></div>
              <div className="skeleton-value"></div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="skeleton-section">
        <div className="skeleton-section-title"></div>
        <div className="skeleton-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-icon"></div>
              <div className="skeleton-label"></div>
              <div className="skeleton-value"></div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="skeleton-section">
        <div className="skeleton-section-title"></div>
        <div className="skeleton-fee-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-fee-card"></div>
          ))}
        </div>
      </div>
      
      <div className="skeleton-section">
        <div className="skeleton-section-title"></div>
        <div className="skeleton-table">
          <div className="skeleton-table-header">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-header-cell"></div>
            ))}
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-table-row">
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
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
        <h3>Student Profile Error</h3>
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
  if (loading || !student) {
    return (
      <div className="erp-loading-container">
        <div className="erp-loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h4 className="erp-loading-text">Loading student profile...</h4>
        <div className="loading-progress">
          <div className="progress-bar"></div>
        </div>
        {renderSkeleton()}
      </div>
    );
  }

  const fee = student.fee;
  const pendingAmount = fee?.totalFee - (fee?.paidAmount || 0);

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item"><a href="/students/approve">Approved Students</a></li>
          <li className="breadcrumb-item active" aria-current="page">{student.fullName}</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaUserGraduate />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Approved Student Profile</h1>
            <p className="erp-page-subtitle">
              Complete personal, academic & fee details
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="erp-btn-icon" />
            <span>Back to Students</span>
          </button>
        </div>
      </div>

      {/* PROFILE BANNER */}
      <div className="profile-banner animate-fade-in">
        <div className="profile-banner-avatar">
          {student.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="profile-banner-info">
          <h2 className="profile-banner-name">{student.fullName}</h2>
          <div className="profile-banner-meta">
            <span className="profile-banner-id">
              <FaGraduationCap className="meta-icon" />
              ID: {student.studentId || "N/A"}
            </span>
            <span className="profile-banner-course">
              <FaBookOpen className="meta-icon" />
              {student.course_id?.name || "N/A"}
            </span>
            <span className="profile-banner-status status-approved">
              <FaCheckCircle className="status-icon" />
              APPROVED
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="main-content-grid animate-fade-in">
        {/* LEFT COLUMN - PERSONAL & ACADEMIC DETAILS */}
        <div className="left-column">
          {/* BASIC INFORMATION */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaUserGraduate className="erp-card-icon" />
                Personal Information
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="erp-table-container">
                <table className="erp-detail-table">
                  <tbody>
                    <DetailRow 
                      label="Email Address" 
                      value={student.email || "N/A"} 
                      icon={<FaEnvelope />}
                      isEmail={true}
                    />
                    <DetailRow 
                      label="Mobile Number" 
                      value={student.mobileNumber || "N/A"} 
                      icon={<FaPhone />}
                    />
                    <DetailRow 
                      label="Gender" 
                      value={student.gender || "N/A"} 
                      icon={<FaUserGraduate />}
                    />
                    <DetailRow 
                      label="Date of Birth" 
                      value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"} 
                      icon={<FaCalendarAlt />}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ADDRESS DETAILS */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaMapMarkerAlt className="erp-card-icon" />
                Address Details
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="erp-table-container">
                <table className="erp-detail-table">
                  <tbody>
                    <DetailRow 
                      label="Address" 
                      value={student.addressLine || "N/A"} 
                      icon={<FaMapMarkerAlt />}
                      isMultiline={true}
                    />
                    <DetailRow 
                      label="City" 
                      value={student.city || "N/A"} 
                      icon={<FaMapMarkerAlt />}
                    />
                    <DetailRow 
                      label="State" 
                      value={student.state || "N/A"} 
                      icon={<FaMapMarkerAlt />}
                    />
                    <DetailRow 
                      label="Pincode" 
                      value={student.pincode || "N/A"} 
                      icon={<FaMapMarkerAlt />}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* PARENT / GUARDIAN INFORMATION */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaUser className="erp-card-icon" />
                Parent / Guardian Information
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="erp-table-container">
                <table className="erp-detail-table">
                  <tbody>
                    <DetailRow
                      label="Father's Name"
                      value={student.fatherName || "N/A"}
                      icon={<FaUser />}
                    />
                    <DetailRow
                      label="Father's Mobile"
                      value={student.fatherMobile || "N/A"}
                      icon={<FaPhone />}
                    />
                    <DetailRow
                      label="Mother's Name"
                      value={student.motherName || "N/A"}
                      icon={<FaUser />}
                    />
                    <DetailRow
                      label="Mother's Mobile"
                      value={student.motherMobile || "N/A"}
                      icon={<FaPhone />}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 10TH (SSC) ACADEMIC DETAILS */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaGraduationCap className="erp-card-icon" />
                10th (SSC) Academic Details
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="erp-table-container">
                <table className="erp-detail-table">
                  <tbody>
                    <DetailRow
                      label="School Name"
                      value={student.sscSchoolName || "N/A"}
                      icon={<FaUniversity />}
                    />
                    <DetailRow
                      label="Board"
                      value={student.sscBoard || "N/A"}
                      icon={<FaUniversity />}
                    />
                    <DetailRow
                      label="Passing Year"
                      value={student.sscPassingYear || "N/A"}
                      icon={<FaCalendarAlt />}
                    />
                    <DetailRow
                      label="Percentage / CGPA"
                      value={student.sscPercentage ? `${student.sscPercentage}%` : "N/A"}
                      icon={<FaGraduationCap />}
                    />
                    <DetailRow
                      label="Roll Number"
                      value={student.sscRollNumber || "N/A"}
                      icon={<FaBookOpen />}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 12TH (HSC) ACADEMIC DETAILS */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaGraduationCap className="erp-card-icon" />
                12th (HSC) Academic Details
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="erp-table-container">
                <table className="erp-detail-table">
                  <tbody>
                    <DetailRow
                      label="School / College Name"
                      value={student.hscSchoolName || "N/A"}
                      icon={<FaUniversity />}
                    />
                    <DetailRow
                      label="Board"
                      value={student.hscBoard || "N/A"}
                      icon={<FaUniversity />}
                    />
                    <DetailRow
                      label="Stream"
                      value={student.hscStream || "N/A"}
                      icon={<FaBookOpen />}
                    />
                    <DetailRow
                      label="Passing Year"
                      value={student.hscPassingYear || "N/A"}
                      icon={<FaCalendarAlt />}
                    />
                    <DetailRow
                      label="Percentage / CGPA"
                      value={student.hscPercentage ? `${student.hscPercentage}%` : "N/A"}
                      icon={<FaGraduationCap />}
                    />
                    <DetailRow
                      label="Roll Number"
                      value={student.hscRollNumber || "N/A"}
                      icon={<FaBookOpen />}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* UPLOADED DOCUMENTS */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaFileAlt className="erp-card-icon" />
                Uploaded Documents
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="erp-table-container">
                <table className="erp-detail-table">
                  <tbody>
                    <DocumentRow
                      label="10th Marksheet"
                      path={student.sscMarksheetPath}
                      icon={<FaFileAlt />}
                    />
                    <DocumentRow
                      label="12th Marksheet"
                      path={student.hscMarksheetPath}
                      icon={<FaFileAlt />}
                    />
                    <DocumentRow
                      label="Passport Photo"
                      path={student.passportPhotoPath}
                      icon={<FaImage />}
                    />
                    <DocumentRow
                      label="Category Certificate"
                      path={student.categoryCertificatePath}
                      icon={<FaFileAlt />}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ACADEMIC DETAILS */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaGraduationCap className="erp-card-icon" />
                Academic Details
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="erp-table-container">
                <table className="erp-detail-table">
                  <tbody>
                    <DetailRow 
                      label="College" 
                      value={student.college_id?.name || "N/A"} 
                      icon={<FaUniversity />}
                    />
                    <DetailRow 
                      label="College Code" 
                      value={student.college_id?.code || "N/A"} 
                      icon={<FaBuilding />}
                    />
                    <DetailRow 
                      label="Department" 
                      value={student.department_id?.name || "N/A"} 
                      icon={<FaBuilding />}
                    />
                    <DetailRow 
                      label="Course" 
                      value={student.course_id?.name || "N/A"} 
                      icon={<FaBookOpen />}
                    />
                    <DetailRow 
                      label="Admission Year" 
                      value={student.admissionYear || "N/A"} 
                      icon={<FaCalendarAlt />}
                    />
                    <DetailRow 
                      label="Current Semester" 
                      value={student.currentSemester || "N/A"} 
                      icon={<FaGraduationCap />}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - FEE & SYSTEM INFO */}
        <div className="right-column">
          {/* FEE SUMMARY */}
          <div className="erp-card fee-summary-card">
            <div className="erp-card-header">
              <h3>
                <FaRupeeSign className="erp-card-icon" />
                Fee Summary
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="fee-summary-grid">
                <div className="fee-item total-fee">
                  <div className="fee-label">Total Fee</div>
                  <div className="fee-value">₹ {fee?.totalFee?.toLocaleString() || 0}</div>
                  <div className="fee-subtitle">Complete program fee</div>
                </div>
                <div className="fee-item paid-fee">
                  <div className="fee-label">Paid Amount</div>
                  <div className="fee-value">₹ {fee?.paidAmount?.toLocaleString() || 0}</div>
                  <div className="fee-subtitle">Amount received</div>
                </div>
                <div className={`fee-item pending-fee ${pendingAmount > 0 ? 'highlight' : ''}`}>
                  <div className="fee-label">Pending Amount</div>
                  <div className="fee-value">₹ {pendingAmount?.toLocaleString() || 0}</div>
                  <div className="fee-subtitle">{pendingAmount > 0 ? 'Payment due' : 'Fully paid'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* INSTALLMENTS TABLE */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaCreditCard className="erp-card-icon" />
                Payment Installments
              </h3>
              <span className="installment-count">
                {fee?.installments?.length || 0} {fee?.installments?.length === 1 ? "Installment" : "Installments"}
              </span>
            </div>
            <div className="erp-card-body">
              {fee?.installments?.length > 0 ? (
                <div className="table-container">
                  <table className="erp-installments-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fee.installments.map((inst, index) => (
                        <tr key={inst._id}>
                          <td>{index + 1}</td>
                          <td>{inst.name}</td>
                          <td>₹ {inst.amount.toLocaleString()}</td>
                          <td>{new Date(inst.dueDate).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge status-${inst.status.toLowerCase()}`}>
                              {inst.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-installments">
                  <FaInfoCircle className="empty-icon" />
                  <p>No installments available for this student</p>
                </div>
              )}
            </div>
          </div>

          {/* SYSTEM INFO */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaShieldAlt className="erp-card-icon" />
                System Information
              </h3>
            </div>
            <div className="erp-card-body">
              <div className="erp-table-container">
                <table className="erp-detail-table">
                  <tbody>
                    <DetailRow 
                      label="Status" 
                      value={student.status || "N/A"} 
                      icon={<FaCheckCircle />}
                    />
                    <DetailRow 
                      label="Registered Via" 
                      value={student.registeredVia || "N/A"} 
                      icon={<FaUserGraduate />}
                    />
                    <DetailRow 
                      label="Approved At" 
                      value={student.approvedAt ? new Date(student.approvedAt).toLocaleDateString() : "N/A"} 
                      icon={<FaCheckCircle />}
                    />
                    <DetailRow 
                      label="Created At" 
                      value={student.createdAt ? new Date(student.createdAt).toLocaleDateString() : "N/A"} 
                      icon={<FaClock />}
                    />
                  </tbody>
                </table>
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
          background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 2rem;
          box-shadow: 0 8px 32px rgba(76, 175, 80, 0.3);
          color: white;
          animation: slideUp 0.6s ease;
        }
        
        .profile-banner-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
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
        
        .profile-banner-id,
        .profile-banner-course {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.25);
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
          background: rgba(255, 255, 255, 0.25);
        }
        
        .status-approved {
          color: white;
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
          display: flex;
          justify-content: space-between;
          align-items: center;
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
        
        .installment-count {
          background: rgba(26, 75, 109, 0.1);
          color: #1a4b6d;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
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
          grid-template-columns: 180px 1fr;
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

        .detail-value .document-link {
          color: #1976d2;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .detail-value .document-link:hover {
          text-decoration: underline;
          color: #1565c0;
        }

        .document-not-uploaded {
          color: #9e9e9e;
          font-style: italic;
          font-size: 0.9rem;
        }

        /* FEE SUMMARY */
        .fee-summary-card {
          grid-row: span 2;
        }
        
        .fee-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          padding: 1.5rem;
        }
        
        .fee-item {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
          transition: all 0.3s ease;
          border: 1px solid #e9ecef;
        }
        
        .fee-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        
        .fee-label {
          font-size: 0.9rem;
          color: #6c757d;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        .fee-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1a4b6d;
          margin-bottom: 0.25rem;
        }
        
        .fee-subtitle {
          font-size: 0.85rem;
          color: #6c757d;
        }
        
        .total-fee .fee-value {
          color: #4CAF50;
        }
        
        .paid-fee .fee-value {
          color: #2196F3;
        }
        
        .pending-fee .fee-value {
          color: #F44336;
        }
        
        .pending-fee.highlight {
          background: rgba(244, 67, 54, 0.08);
          border-color: #F44336;
          box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.15);
        }
        
        /* INSTALLMENTS TABLE */
        .erp-installments-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .erp-installments-table thead {
          background: #f8f9fa;
          border-bottom: 2px solid #e9ecef;
        }
        
        .erp-installments-table th {
          padding: 1rem 1.75rem;
          text-align: left;
          font-weight: 700;
          color: #1a4b6d;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .erp-installments-table tbody tr {
          border-bottom: 1px solid #f0f2f5;
        }
        
        .erp-installments-table tbody tr:last-child {
          border-bottom: none;
        }
        
        .erp-installments-table tbody tr:hover {
          background: #f8f9ff;
        }
        
        .erp-installments-table td {
          padding: 1rem 1.75rem;
          color: #2c3e50;
          font-weight: 500;
        }
        
        .status-badge {
          display: inline-block;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        
        .status-paid {
          background: rgba(76, 175, 80, 0.15);
          color: #4CAF50;
        }
        
        .status-pending {
          background: rgba(255, 152, 0, 0.15);
          color: #e68a00;
        }
        
        .empty-installments {
          text-align: center;
          padding: 2rem;
          color: #6c757d;
        }
        
        .empty-icon {
          font-size: 3rem;
          opacity: 0.3;
          margin-bottom: 1rem;
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
        
        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        
        .skeleton-card {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
        }
        
        .skeleton-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #e9ecef;
          margin: 0 auto 1rem;
        }
        
        .skeleton-label {
          height: 16px;
          background: #e9ecef;
          border-radius: 4px;
          width: 60%;
          margin: 0 auto;
        }
        
        .skeleton-value {
          height: 24px;
          background: #e9ecef;
          border-radius: 4px;
          width: 80%;
          margin: 0.5rem auto 0;
        }
        
        .skeleton-fee-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        
        .skeleton-fee-card {
          height: 120px;
          background: #f8f9fa;
          border-radius: 12px;
          border: 1px solid #e9ecef;
        }
        
        .skeleton-table {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .skeleton-table-header {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          background: #f8f9fa;
          border-bottom: 2px solid #e9ecef;
        }
        
        .skeleton-header-cell {
          height: 40px;
          background: #e9ecef;
        }
        
        .skeleton-table-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
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
          
          .fee-summary-grid {
            grid-template-columns: 1fr;
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
          
          .erp-installments-table th,
          .erp-installments-table td {
            padding: 0.875rem 1.25rem;
            font-size: 0.9rem;
          }
          
          .erp-skeleton-container {
            padding: 1rem;
          }
          
          .skeleton-header {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }
          
          .skeleton-grid {
            grid-template-columns: 1fr;
          }
          
          .skeleton-table-header,
          .skeleton-table-row {
            grid-template-columns: repeat(3, 1fr);
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
          
          .erp-installments-table thead {
            display: none;
          }
          
          .erp-installments-table tbody tr {
            display: block;
            margin-bottom: 1rem;
            border: 1px solid #f0f2f5;
            border-radius: 8px;
          }
          
          .erp-installments-table td {
            display: block;
            padding: 0.75rem 1rem;
          }
          
          .erp-installments-table td:first-child::before {
            content: "# ";
            font-weight: 600;
            color: #1a4b6d;
          }
          
          .erp-installments-table td:nth-child(2)::before {
            content: "Name: ";
            font-weight: 600;
            color: #1a4b6d;
          }
          
          .erp-installments-table td:nth-child(3)::before {
            content: "Amount: ";
            font-weight: 600;
            color: #1a4b6d;
          }
          
          .erp-installments-table td:nth-child(4)::before {
            content: "Due Date: ";
            font-weight: 600;
            color: #1a4b6d;
          }
          
          .erp-installments-table td:nth-child(5)::before {
            content: "Status: ";
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

/* ================= DOCUMENT ROW COMPONENT ================= */
function DocumentRow({ label, path, icon }) {
  const getFileName = (filePath) => {
    if (!filePath) return null;
    const parts = filePath.split(/[\\/]/);
    return parts[parts.length - 1];
  };

  const fileName = getFileName(path);
  // Get base URL from environment variable with proper /api suffix as fallback
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  return (
    <tr className="detail-row">
      <td className="detail-label">
        <span className="detail-label-icon">{icon}</span>
        {label}
      </td>
      <td className="detail-value">
        {path ? (
          <a
            href={`${baseUrl}/${path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="document-link"
          >
            {fileName || "View Document"}
          </a>
        ) : (
          <span className="document-not-uploaded">Not uploaded</span>
        )}
      </td>
    </tr>
  );
}