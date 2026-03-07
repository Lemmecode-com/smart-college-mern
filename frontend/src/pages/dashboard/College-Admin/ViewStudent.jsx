import { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import {
  FaUserGraduate,
  FaUniversity,
  FaBook,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaFileAlt,
  FaImage,
  FaUser,
  FaGraduationCap,
  FaHome,
  FaIdCard,
  FaAward,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaClock,
  FaDownload,
  FaEye,
  FaArrowUp,
  FaShieldAlt,
  FaBolt
} from "react-icons/fa";

/* =========================================================
   DESIGN SYSTEM CONSTANTS
========================================================= */
const COLORS = {
  primary: {
    dark: '#0f3a4a',
    main: '#134952',
    light: '#1a5a6a',
    accent: '#4fc3f7',
    glow: 'rgba(79, 195, 247, 0.4)'
  },
  secondary: {
    teal: '#0d9488',
    cyan: '#06b6d4',
    blue: '#3b82f6'
  },
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

const USER_ROLES = {
  COLLEGE_ADMIN: 'COLLEGE_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT'
};

const STUDENT_STATUS = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PENDING: 'PENDING'
};

const STATUS_CONFIG = {
  [STUDENT_STATUS.APPROVED]: { label: 'Approved', color: COLORS.success, bg: 'rgba(16, 185, 129, 0.1)', icon: FaCheckCircle },
  [STUDENT_STATUS.REJECTED]: { label: 'Rejected', color: COLORS.danger, bg: 'rgba(239, 68, 68, 0.1)', icon: FaTimesCircle },
  [STUDENT_STATUS.PENDING]: { label: 'Pending', color: COLORS.warning, bg: 'rgba(245, 158, 11, 0.1)', icon: FaClock }
};

const ERROR_MESSAGES = {
  NETWORK: 'Unable to connect to server. Please check your internet connection.',
  NOT_FOUND: 'Student not found. The student ID may be invalid or the record was deleted.',
  UNAUTHORIZED: 'You do not have permission to view this student profile.',
  SERVER: 'Server error occurred. Please try again later.',
  INVALID_ID: 'Invalid student ID. Please check the URL.',
  LOAD_FAILED: 'Failed to load student profile',
  APPROVE_FAILED: 'Failed to approve student',
  REJECT_FAILED: 'Failed to reject student'
};

const HTTP_ERROR_MAP = {
  400: ERROR_MESSAGES.INVALID_ID,
  401: ERROR_MESSAGES.UNAUTHORIZED,
  403: ERROR_MESSAGES.UNAUTHORIZED,
  404: ERROR_MESSAGES.NOT_FOUND,
  500: ERROR_MESSAGES.SERVER,
  502: ERROR_MESSAGES.NETWORK,
  503: ERROR_MESSAGES.NETWORK
};

const VALIDATION_PATTERNS = {
  MONGO_OBJECT_ID: /^[0-9a-fA-F]{24}$/
};

/* =========================================================
   UTILITY FUNCTIONS
========================================================= */
const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const defaultOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-IN', { ...defaultOptions, ...options });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const isValidObjectId = (id) => {
  return VALIDATION_PATTERNS.MONGO_OBJECT_ID.test(id);
};

const getFileName = (filePath) => {
  if (!filePath) return null;
  const parts = filePath.split('\\');
  return parts[parts.length - 1];
};

/* =========================================================
   REUSABLE COMPONENTS
========================================================= */

// Stat Card Component
function StatCard({ icon, label, value, subValue, color = 'primary' }) {
  const colorMap = {
    primary: { bg: 'rgba(15, 58, 74, 0.08)', color: COLORS.primary.main, icon: COLORS.primary.accent },
    success: { bg: 'rgba(16, 185, 129, 0.08)', color: COLORS.success, icon: COLORS.success },
    warning: { bg: 'rgba(245, 158, 11, 0.08)', color: COLORS.warning, icon: COLORS.warning },
    danger: { bg: 'rgba(239, 68, 68, 0.08)', color: COLORS.danger, icon: COLORS.danger },
    info: { bg: 'rgba(59, 130, 246, 0.08)', color: COLORS.info, icon: COLORS.info },
    teal: { bg: 'rgba(13, 148, 136, 0.08)', color: COLORS.secondary.teal, icon: COLORS.secondary.teal }
  };

  const theme = colorMap[color] || colorMap.primary;

  return (
    <div className="stat-card-enterprise">
      <div className="stat-card-body">
        <div className="stat-card-icon" style={{ backgroundColor: theme.bg, color: theme.icon }}>
          {icon}
        </div>
        <div className="stat-card-content">
          <div className="stat-card-label">{label}</div>
          <div className="stat-card-value" style={{ color: theme.color }}>{value}</div>
          {subValue && <div className="stat-card-sub">{subValue}</div>}
        </div>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[STUDENT_STATUS.PENDING];
  const IconComponent = config.icon;
  
  return (
    <span 
      className="status-badge-enterprise"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      <IconComponent className="status-icon" />
      {config.label}
    </span>
  );
}

// Info Row Component
function InfoRow({ icon, label, value, iconColor = COLORS.primary.accent }) {
  return (
    <div className="info-row-enterprise">
      <div className="info-row-icon" style={{ color: iconColor }}>
        {icon}
      </div>
      <div className="info-row-content">
        <div className="info-row-label">{label}</div>
        <div className="info-row-value">{value || '-'}</div>
      </div>
    </div>
  );
}

// Document Card Component
function DocumentCard({ label, path, icon, onView }) {
  const fileName = getFileName(path);
  
  return (
    <div className="document-card-enterprise">
      <div className="document-card-header">
        <div className="document-icon" style={{ color: COLORS.primary.accent }}>
          {icon}
        </div>
        <div className="document-label">{label}</div>
      </div>
      <div className="document-card-body">
        <div className="document-filename" title={fileName}>
          {fileName || 'Document'}
        </div>
        <button 
          className="btn-view-document"
          onClick={() => onView(path)}
          aria-label={`View ${label}`}
        >
          <FaEye className="me-1" />
          View
        </button>
      </div>
    </div>
  );
}

// Skeleton Loader Component
function SkeletonLoader() {
  return (
    <div className="view-student-page">
      <div className="page-header-enterprise">
        <div className="skeleton skeleton-title" style={{ width: '280px', height: '36px' }}></div>
        <div className="skeleton skeleton-subtitle" style={{ width: '200px', height: '18px' }}></div>
      </div>

      <div className="stats-grid-enterprise">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-card" style={{ height: '120px' }}></div>
        ))}
      </div>

      <div className="content-grid-enterprise">
        {[1, 2, 3].map(i => (
          <div key={i} className="content-card-enterprise">
            <div className="skeleton" style={{ width: '200px', height: '24px', marginBottom: '20px' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '200px' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Error Display Component
function ErrorDisplay({ error, onRetry }) {
  return (
    <div className="view-student-page">
      <div className="error-container-enterprise">
        <div className="error-card">
          <div className="error-icon-wrapper">
            <FaExclamationTriangle className="error-icon" />
          </div>
          <h3 className="error-title">Unable to Load Student Profile</h3>
          <p className="error-message">{error}</p>
          {onRetry && (
            <button className="btn-retry-enterprise" onClick={onRetry}>
              <FaClock className="me-2" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Confirmation Modal Component
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, type = 'info', isLoading }) {
  if (!isOpen) return null;

  const typeConfig = {
    info: { color: COLORS.info, icon: FaExclamationTriangle },
    danger: { color: COLORS.danger, icon: FaExclamationTriangle },
    success: { color: COLORS.success, icon: FaCheckCircle }
  };

  const config = typeConfig[type] || typeConfig.info];

  return (
    <div className="modal-backdrop-enterprise">
      <div className="modal-enterprise">
        <div className="modal-header">
          <div className="modal-icon" style={{ color: config.color }}>
            <config.icon />
          </div>
          <h4 className="modal-title">{title}</h4>
        </div>
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-modal-cancel" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button 
            className="btn-modal-confirm" 
            onClick={onConfirm}
            style={{ backgroundColor: config.color }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function ViewStudent() {
  const { user } = useContext(AuthContext);
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  /* ================= SECURITY & VALIDATION ================= */
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== USER_ROLES.COLLEGE_ADMIN) return <Navigate to="/dashboard" replace />;

  const isIdValid = useMemo(() => {
    if (!studentId) return false;
    return isValidObjectId(studentId);
  }, [studentId]);

  /* ================= FETCH STUDENT ================= */
  const fetchStudent = useCallback(async () => {
    if (!isIdValid) {
      setError(ERROR_MESSAGES.INVALID_ID);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/students/registered/${studentId}`);
      const studentData = res.data?.student || res.data;
      setStudent(studentData);
    } catch (err) {
      console.error('Fetch student error:', err);
      const status = err.response?.status;
      const specificError = HTTP_ERROR_MAP[status] || ERROR_MESSAGES.LOAD_FAILED;
      setError(specificError);
    } finally {
      setLoading(false);
    }
  }, [studentId, isIdValid]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  /* ================= HELPER FUNCTIONS ================= */
  const has10thDetails = useMemo(() => {
    if (!student) return false;
    return !!(student.sscSchoolName?.trim() ||
              student.sscBoard?.trim() ||
              student.sscPassingYear ||
              student.sscPercentage ||
              student.sscRollNumber?.trim());
  }, [student]);

  const has12thDetails = useMemo(() => {
    if (!student) return false;
    return !!(student.hscSchoolName?.trim() ||
              student.hscBoard?.trim() ||
              student.hscStream ||
              student.hscPassingYear ||
              student.hscPercentage ||
              student.hscRollNumber?.trim());
  }, [student]);

  const uploadedDocuments = useMemo(() => {
    if (!student) return [];
    
    const docs = [];
    const docMapping = [
      { key: 'sscMarksheetPath', label: '10th Marksheet', icon: FaFileAlt },
      { key: 'hscMarksheetPath', label: '12th Marksheet', icon: FaFileAlt },
      { key: 'passportPhotoPath', label: 'Passport Photo', icon: FaImage },
      { key: 'categoryCertificatePath', label: 'Category Certificate', icon: FaFileAlt },
      { key: 'incomeCertificatePath', label: 'Income Certificate', icon: FaFileAlt },
      { key: 'characterCertificatePath', label: 'Character Certificate', icon: FaFileAlt },
      { key: 'transferCertificatePath', label: 'Transfer Certificate', icon: FaFileAlt },
      { key: 'aadharCardPath', label: 'Aadhar Card', icon: FaIdCard },
      { key: 'entranceExamScorePath', label: 'Entrance Exam Score', icon: FaAward },
      { key: 'migrationCertificatePath', label: 'Migration Certificate', icon: FaFileAlt },
      { key: 'domicileCertificatePath', label: 'Domicile Certificate', icon: FaFileAlt },
      { key: 'casteCertificatePath', label: 'Caste Certificate', icon: FaFileAlt },
      { key: 'nonCreamyLayerCertificatePath', label: 'Non-Creamy Layer Certificate', icon: FaFileAlt },
      { key: 'physicallyChallengedCertificatePath', label: 'Physically Challenged Certificate', icon: FaFileAlt },
      { key: 'sportsQuotaCertificatePath', label: 'Sports Quota Certificate', icon: FaAward },
      { key: 'nriSponsorCertificatePath', label: 'NRI Sponsor Certificate', icon: FaFileAlt },
      { key: 'gapCertificatePath', label: 'Gap Certificate', icon: FaFileAlt },
      { key: 'affidavitPath', label: 'Affidavit', icon: FaFileAlt }
    ];

    docMapping.forEach(({ key, label, icon: Icon }) => {
      if (student[key]) {
        docs.push({ label, path: student[key], icon: Icon });
      }
    });

    return docs;
  }, [student]);

  /* ================= ACTION HANDLERS ================= */
  const handleViewDocument = useCallback((path) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    window.open(`${baseUrl}/${path}`, '_blank', 'noopener,noreferrer');
  }, []);

  const handleApprove = useCallback(async () => {
    try {
      setApproving(true);
      await api.put(`/students/${studentId}/approve`);
      toast.success("Student approved successfully");
      navigate("/students/approve", { state: { refresh: true } });
    } catch (err) {
      console.error('Approve error:', err);
      toast.error(err.response?.data?.message || ERROR_MESSAGES.APPROVE_FAILED);
    } finally {
      setApproving(false);
    }
  }, [studentId, navigate]);

  const handleRejectClick = useCallback(() => {
    setRejectionReason('');
    setShowRejectModal(true);
  }, []);

  const handleRejectSubmit = useCallback(() => {
    if (!rejectionReason.trim()) {
      toast.warning("Please enter a rejection reason");
      return;
    }
    setShowRejectModal(false);
    setShowRejectConfirm(true);
  }, [rejectionReason]);

  const handleConfirmReject = useCallback(async () => {
    try {
      setRejecting(true);
      setShowRejectConfirm(false);
      await api.put(`/students/${studentId}/reject`, {
        reason: rejectionReason.trim()
      });
      toast.success("Student rejected successfully");
      fetchStudent();
    } catch (err) {
      console.error('Reject error:', err);
      toast.error(err.response?.data?.message || ERROR_MESSAGES.REJECT_FAILED);
    } finally {
      setRejecting(false);
    }
  }, [studentId, rejectionReason, fetchStudent]);

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <SkeletonLoader />;
  }

  if (error && !student) {
    return <ErrorDisplay error={error} onRetry={fetchStudent} />;
  }

  if (!student) {
    return <ErrorDisplay error={ERROR_MESSAGES.NOT_FOUND} />;
  }

  return (
    <div className="view-student-page">
      {/* ================= PAGE HEADER ================= */}
      <div className="page-header-enterprise">
        <div className="header-content">
          <div className="header-branding">
            <div className="header-icon-wrapper">
              <FaUserGraduate className="header-icon" />
            </div>
            <div className="header-text">
              <h1 className="page-title">Student Profile</h1>
              <p className="page-subtitle">Complete student details with academic records</p>
            </div>
          </div>
          
          <div className="header-actions">
            <StatusBadge status={student.status} />
            <button
              className="btn-back-enterprise"
              onClick={() => navigate(-1)}
              aria-label="Go back to previous page"
            >
              <FaArrowLeft className="btn-icon" />
              <span>Back</span>
            </button>
          </div>
        </div>
        <div className="header-gradient-overlay"></div>
      </div>

      {/* ================= STATS GRID ================= */}
      <div className="stats-grid-enterprise">
        <StatCard
          icon={<FaUser />}
          label="Student Name"
          value={student.fullName || 'N/A'}
          color="primary"
        />
        <StatCard
          icon={<FaEnvelope />}
          label="Email Address"
          value={student.email || 'N/A'}
          color="teal"
        />
        <StatCard
          icon={<FaPhone />}
          label="Mobile Number"
          value={student.mobileNumber || 'N/A'}
          color="success"
        />
        <StatCard
          icon={<FaCalendarAlt />}
          label="Admission Year"
          value={student.admissionYear || 'N/A'}
          subValue={`Semester ${student.currentSemester || 'N/A'}`}
          color="info"
        />
      </div>

      {/* ================= CONTENT GRID ================= */}
      <div className="content-grid-enterprise">
        {/* Left Column */}
        <div className="content-column">
          {/* Parent/Guardian Info */}
          <div className="content-card-enterprise">
            <div className="card-header-enterprise">
              <div className="card-title-wrapper">
                <FaUser className="card-title-icon" />
                <h3 className="card-title">Parent / Guardian Information</h3>
              </div>
            </div>
            
            <div className="card-body-enterprise">
              <InfoRow
                icon={<FaUser />}
                label="Father's Name"
                value={student.fatherName}
                iconColor={COLORS.primary.accent}
              />
              <InfoRow
                icon={<FaPhone />}
                label="Father's Mobile"
                value={student.fatherMobile}
                iconColor={COLORS.secondary.cyan}
              />
              <InfoRow
                icon={<FaUser />}
                label="Mother's Name"
                value={student.motherName}
                iconColor={COLORS.primary.accent}
              />
              <InfoRow
                icon={<FaPhone />}
                label="Mother's Mobile"
                value={student.motherMobile}
                iconColor={COLORS.secondary.cyan}
              />
            </div>
          </div>

          {/* 10th Academic Details */}
          {has10thDetails && (
            <div className="content-card-enterprise">
              <div className="card-header-enterprise">
                <div className="card-title-wrapper">
                  <FaGraduationCap className="card-title-icon" />
                  <h3 className="card-title">10th (SSC) Details</h3>
                </div>
              </div>
              
              <div className="card-body-enterprise">
                <InfoRow
                  icon={<FaUniversity />}
                  label="School Name"
                  value={student.sscSchoolName}
                  iconColor={COLORS.primary.accent}
                />
                <InfoRow
                  icon={<FaBook />}
                  label="Board"
                  value={student.sscBoard}
                  iconColor={COLORS.secondary.cyan}
                />
                <InfoRow
                  icon={<FaCalendarAlt />}
                  label="Passing Year"
                  value={student.sscPassingYear}
                  iconColor={COLORS.warning}
                />
                <InfoRow
                  icon={<FaAward />}
                  label="Percentage / CGPA"
                  value={student.sscPercentage ? `${student.sscPercentage}%` : '-'}
                  iconColor={COLORS.success}
                />
                <InfoRow
                  icon={<FaIdCard />}
                  label="Roll Number"
                  value={student.sscRollNumber}
                  iconColor={COLORS.info}
                />
              </div>
            </div>
          )}

          {/* 12th Academic Details */}
          {has12thDetails && (
            <div className="content-card-enterprise">
              <div className="card-header-enterprise">
                <div className="card-title-wrapper">
                  <FaGraduationCap className="card-title-icon" />
                  <h3 className="card-title">12th (HSC) Details</h3>
                </div>
              </div>
              
              <div className="card-body-enterprise">
                <InfoRow
                  icon={<FaUniversity />}
                  label="School / College Name"
                  value={student.hscSchoolName}
                  iconColor={COLORS.primary.accent}
                />
                <InfoRow
                  icon={<FaBook />}
                  label="Board"
                  value={student.hscBoard}
                  iconColor={COLORS.secondary.cyan}
                />
                <InfoRow
                  icon={<FaAward />}
                  label="Stream"
                  value={student.hscStream}
                  iconColor={COLORS.info}
                />
                <InfoRow
                  icon={<FaCalendarAlt />}
                  label="Passing Year"
                  value={student.hscPassingYear}
                  iconColor={COLORS.warning}
                />
                <InfoRow
                  icon={<FaAward />}
                  label="Percentage / CGPA"
                  value={student.hscPercentage ? `${student.hscPercentage}%` : '-'}
                  iconColor={COLORS.success}
                />
                <InfoRow
                  icon={<FaIdCard />}
                  label="Roll Number"
                  value={student.hscRollNumber}
                  iconColor={COLORS.primary.accent}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="content-column">
          {/* Basic Information */}
          <div className="content-card-enterprise">
            <div className="card-header-enterprise">
              <div className="card-title-wrapper">
                <FaUser className="card-title-icon" />
                <h3 className="card-title">Basic Information</h3>
              </div>
            </div>
            
            <div className="card-body-enterprise">
              <div className="info-grid">
                <InfoRow icon={<FaUser />} label="Gender" value={student.gender} iconColor={COLORS.primary.accent} />
                <InfoRow icon={<FaCalendarAlt />} label="Date of Birth" value={formatDate(student.dateOfBirth)} iconColor={COLORS.secondary.cyan} />
                <InfoRow icon={<FaHome />} label="Nationality" value={student.nationality} iconColor={COLORS.info} />
                <InfoRow icon={<FaAward />} label="Category" value={student.category} iconColor={COLORS.warning} />
              </div>
            </div>
          </div>

          {/* Address Details */}
          <div className="content-card-enterprise">
            <div className="card-header-enterprise">
              <div className="card-title-wrapper">
                <FaMapMarkerAlt className="card-title-icon" />
                <h3 className="card-title">Address Details</h3>
              </div>
            </div>
            
            <div className="card-body-enterprise">
              <InfoRow
                icon={<FaHome />}
                label="Address"
                value={student.addressLine}
                iconColor={COLORS.primary.accent}
              />
              <div className="info-grid-2">
                <InfoRow icon={<FaMapMarkerAlt />} label="City" value={student.city} iconColor={COLORS.secondary.cyan} />
                <InfoRow icon={<FaMapMarkerAlt />} label="State" value={student.state} iconColor={COLORS.info} />
              </div>
              <InfoRow icon={<FaIdCard />} label="Pincode" value={student.pincode} iconColor={COLORS.warning} />
            </div>
          </div>

          {/* Academic Information */}
          <div className="content-card-enterprise">
            <div className="card-header-enterprise">
              <div className="card-title-wrapper">
                <FaBook className="card-title-icon" />
                <h3 className="card-title">Academic Information</h3>
              </div>
            </div>
            
            <div className="card-body-enterprise">
              <InfoRow
                icon={<FaUniversity />}
                label="College"
                value={student.college_id?.name}
                iconColor={COLORS.primary.accent}
              />
              <InfoRow
                icon={<FaIdCard />}
                label="College Code"
                value={student.college_id?.code}
                iconColor={COLORS.secondary.cyan}
              />
              <InfoRow
                icon={<FaBook />}
                label="Department"
                value={student.department_id?.name}
                iconColor={COLORS.info}
              />
              <InfoRow
                icon={<FaAward />}
                label="Course"
                value={student.course_id?.name}
                iconColor={COLORS.success}
              />
            </div>
          </div>

          {/* Uploaded Documents */}
          {uploadedDocuments.length > 0 && (
            <div className="content-card-enterprise">
              <div className="card-header-enterprise">
                <div className="card-title-wrapper">
                  <FaFileAlt className="card-title-icon" />
                  <h3 className="card-title">Uploaded Documents</h3>
                </div>
                <span className="card-badge">{uploadedDocuments.length} Files</span>
              </div>
              
              <div className="card-body-enterprise">
                <div className="documents-grid">
                  {uploadedDocuments.map((doc, index) => (
                    <DocumentCard
                      key={index}
                      label={doc.label}
                      path={doc.path}
                      icon={doc.icon}
                      onView={handleViewDocument}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= STATUS ACTION CARD ================= */}
      {student.status === STUDENT_STATUS.PENDING && (
        <div className="action-card-enterprise">
          <div className="action-card-header">
            <div className="action-card-title-wrapper">
              <FaClipboardCheck className="action-card-icon" />
              <h3 className="action-card-title">Student Verification</h3>
            </div>
            <p className="action-card-subtitle">Review and approve or reject this student's registration</p>
          </div>
          
          <div className="action-card-body">
            <button
              className="btn-approve-enterprise"
              onClick={handleApprove}
              disabled={approving}
            >
              <FaCheckCircle className="btn-icon" />
              {approving ? 'Approving...' : 'Approve Student'}
            </button>
            
            <button
              className="btn-reject-enterprise"
              onClick={handleRejectClick}
              disabled={rejecting}
            >
              <FaTimesCircle className="btn-icon" />
              {rejecting ? 'Rejecting...' : 'Reject Student'}
            </button>
          </div>
        </div>
      )}

      {/* ================= META INFORMATION ================= */}
      <div className="meta-info-enterprise">
        <div className="meta-item">
          <FaClock className="meta-icon" />
          <span>Registered on {formatDateTime(student.createdAt)}</span>
        </div>
        <div className="meta-item">
          <FaShieldAlt className="meta-icon" />
          <span>Via {student.registeredVia || 'Direct'}</span>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      <ConfirmModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleRejectSubmit}
        title="Rejection Reason"
        message="Please enter the reason for rejecting this student's registration:"
        type="danger"
        isLoading={rejecting}
        customContent={
          <textarea
            className="reject-reason-textarea"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            rows={4}
            autoFocus
          />
        }
      />

      <ConfirmModal
        isOpen={showRejectConfirm}
        onClose={() => setShowRejectConfirm(false)}
        onConfirm={handleConfirmReject}
        title="Confirm Rejection"
        message={`Are you sure you want to reject this student? Reason: "${rejectionReason}"`}
        type="danger"
        isLoading={rejecting}
      />

      {/* ================= DESIGN SYSTEM CSS ================= */}
      <style>
        {`
        /* =====================================================
           ENTERPRISE DESIGN SYSTEM - View Student Page
           ===================================================== */
        
        .view-student-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        /* Page Header */
        .page-header-enterprise {
          position: relative;
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 50%, #1a5a6a 100%);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(15, 58, 74, 0.24);
          overflow: hidden;
          border: 1px solid rgba(79, 195, 247, 0.15);
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
          flex-wrap: wrap;
          position: relative;
          z-index: 2;
        }
        
        .header-branding {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        
        .header-icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: rgba(79, 195, 247, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(79, 195, 247, 0.3);
          box-shadow: 0 4px 16px rgba(79, 195, 247, 0.2);
        }
        
        .header-icon {
          font-size: 1.75rem;
          color: #4fc3f7;
        }
        
        .header-text {
          color: #ffffff;
        }
        
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        .page-subtitle {
          font-size: 0.9375rem;
          color: rgba(230, 242, 245, 0.85);
          margin: 0;
          font-weight: 400;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .btn-back-enterprise {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }
        
        .btn-back-enterprise:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        
        .btn-icon {
          font-size: 0.875rem;
        }
        
        .header-gradient-overlay {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(79, 195, 247, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(79, 195, 247, 0.08) 0%, transparent 50%);
          pointer-events: none;
        }
        
        /* Status Badge */
        .status-badge-enterprise {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        
        .status-icon {
          font-size: 0.875rem;
        }
        
        /* Stats Grid */
        .stats-grid-enterprise {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .stat-card-enterprise {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(0, 0, 0, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .stat-card-enterprise:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
        }
        
        .stat-card-body {
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
        }
        
        .stat-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        
        .stat-card-enterprise:hover .stat-card-icon {
          transform: scale(1.1);
        }
        
        .stat-card-content {
          flex: 1;
          min-width: 0;
        }
        
        .stat-card-label {
          font-size: 0.8125rem;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }
        
        .stat-card-value {
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 0.25rem;
          line-height: 1.3;
          word-wrap: break-word;
        }
        
        .stat-card-sub {
          font-size: 0.8125rem;
          color: #9ca3af;
          font-weight: 500;
        }
        
        /* Content Grid */
        .content-grid-enterprise {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .content-column {
          min-width: 0;
        }
        
        /* Content Card */
        .content-card-enterprise {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(0, 0, 0, 0.04);
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        
        .card-header-enterprise {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f3f4f6;
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.02) 0%, rgba(19, 73, 82, 0.02) 100%);
        }
        
        .card-title-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .card-title-icon {
          font-size: 1.125rem;
          color: #0f3a4a;
        }
        
        .card-title {
          font-size: 1.0625rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        
        .card-badge {
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 100%);
          color: #ffffff;
          padding: 0.375rem 0.875rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
        }
        
        .card-body-enterprise {
          padding: 1.5rem;
        }
        
        /* Info Row */
        .info-row-enterprise {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
          padding: 1rem 0;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .info-row-enterprise:last-child {
          border-bottom: none;
        }
        
        .info-row-icon {
          font-size: 1.125rem;
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(79, 195, 247, 0.08);
          border-radius: 10px;
        }
        
        .info-row-content {
          flex: 1;
          min-width: 0;
        }
        
        .info-row-label {
          font-size: 0.8125rem;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        
        .info-row-value {
          font-size: 0.9375rem;
          color: #111827;
          font-weight: 600;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        
        .info-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        
        /* Document Card */
        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .document-card-enterprise {
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        
        .document-card-enterprise:hover {
          border-color: #0f3a4a;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }
        
        .document-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .document-icon {
          font-size: 1.25rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(79, 195, 247, 0.1);
          border-radius: 10px;
        }
        
        .document-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #374151;
        }
        
        .document-card-body {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .document-filename {
          font-size: 0.8125rem;
          color: #6b7280;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .btn-view-document {
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 100%);
          color: #ffffff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-view-document:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 58, 74, 0.3);
        }
        
        /* Action Card */
        .action-card-enterprise {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          border: 2px solid rgba(15, 58, 74, 0.1);
          overflow: hidden;
          margin-bottom: 2rem;
        }
        
        .action-card-header {
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.05) 0%, rgba(19, 73, 82, 0.05) 100%);
          border-bottom: 1px solid #f3f4f6;
        }
        
        .action-card-title-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        
        .action-card-icon {
          font-size: 1.25rem;
          color: #0f3a4a;
        }
        
        .action-card-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        
        .action-card-subtitle {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }
        
        .action-card-body {
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        
        .btn-approve-enterprise {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          border: none;
          padding: 0.875rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9375rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }
        
        .btn-approve-enterprise:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
        }
        
        .btn-reject-enterprise {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #ffffff;
          border: none;
          padding: 0.875rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9375rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
        }
        
        .btn-reject-enterprise:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
        }
        
        .btn-approve-enterprise:disabled,
        .btn-reject-enterprise:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        /* Meta Info */
        .meta-info-enterprise {
          display: flex;
          justify-content: center;
          gap: 2rem;
          padding: 1.5rem;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .meta-icon {
          color: #0f3a4a;
        }
        
        /* Modal */
        .modal-backdrop-enterprise {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        
        .modal-enterprise {
          background: #ffffff;
          border-radius: 16px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .modal-icon {
          font-size: 2rem;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 14px;
        }
        
        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        
        .modal-body {
          padding: 1.5rem;
        }
        
        .modal-message {
          font-size: 0.9375rem;
          color: #374151;
          margin: 0 0 1rem 0;
        }
        
        .reject-reason-textarea {
          width: 100%;
          padding: 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-family: inherit;
          resize: vertical;
          transition: all 0.2s ease;
        }
        
        .reject-reason-textarea:focus {
          outline: none;
          border-color: #0f3a4a;
          box-shadow: 0 0 0 3px rgba(15, 58, 74, 0.1);
        }
        
        .modal-footer {
          display: flex;
          gap: 1rem;
          padding: 1.5rem;
          border-top: 1px solid #f3f4f6;
        }
        
        .btn-modal-cancel {
          flex: 1;
          background: #f3f4f6;
          color: #374151;
          border: none;
          padding: 0.875rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-modal-cancel:hover:not(:disabled) {
          background: #e5e7eb;
        }
        
        .btn-modal-confirm {
          flex: 1;
          color: #ffffff;
          border: none;
          padding: 0.875rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-modal-confirm:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .btn-modal-cancel:disabled,
        .btn-modal-confirm:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        /* Skeleton Loader */
        @keyframes skeleton-loading {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        
        .skeleton {
          background: linear-gradient(
            90deg,
            #f0f0f0 0%,
            #e0e0e0 50%,
            #f0f0f0 100%
          );
          background-size: 200px 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 12px;
        }
        
        .skeleton-card {
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            #f5f5f5 50%,
            #ffffff 100%
          );
          background-size: 200px 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
        }
        
        /* Error Container */
        .error-container-enterprise {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        
        .error-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 3rem 2rem;
          max-width: 480px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
          border: 1px solid #e5e7eb;
        }
        
        .error-icon-wrapper {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.15) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .error-icon {
          font-size: 2.5rem;
          color: #ef4444;
        }
        
        .error-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.75rem;
        }
        
        .error-message {
          color: #6b7280;
          font-size: 0.9375rem;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        
        .btn-retry-enterprise {
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 100%);
          color: #ffffff;
          border: none;
          padding: 0.875rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9375rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(15, 58, 74, 0.3);
        }
        
        .btn-retry-enterprise:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 58, 74, 0.4);
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .content-grid-enterprise {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 768px) {
          .view-student-page {
            padding: 1rem;
          }
          
          .page-header-enterprise {
            padding: 1.5rem;
          }
          
          .header-content {
            flex-direction: column;
            gap: 1.5rem;
          }
          
          .header-branding {
            width: 100%;
          }
          
          .header-actions {
            width: 100%;
            justify-content: space-between;
          }
          
          .page-title {
            font-size: 1.5rem;
          }
          
          .stats-grid-enterprise {
            grid-template-columns: 1fr;
          }
          
          .action-card-body {
            flex-direction: column;
          }
          
          .btn-approve-enterprise,
          .btn-reject-enterprise {
            width: 100%;
            justify-content: center;
          }
          
          .info-grid,
          .info-grid-2 {
            grid-template-columns: 1fr;
          }
          
          .documents-grid {
            grid-template-columns: 1fr;
          }
          
          .meta-info-enterprise {
            flex-direction: column;
            gap: 1rem;
          }
        }
        
        /* Print Styles */
        @media print {
          .page-header-enterprise,
          .action-card-enterprise,
          .btn-back-enterprise,
          .no-print {
            display: none !important;
          }
          
          .view-student-page {
            background: white;
            padding: 0;
          }
          
          .content-card-enterprise {
            box-shadow: none;
            border: 1px solid #ddd;
            page-break-inside: avoid;
          }
        }
        `}
      </style>
    </div>
  );
}
