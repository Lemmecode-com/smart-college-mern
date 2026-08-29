import { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { getDocumentViewUrl } from "../../../utils/documentUrl";
import { toast } from "react-toastify";
import ConfirmModal from "../../../components/ConfirmModal";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import useRole from "../../../hooks/useRole";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import {
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
  FaBolt,
  FaUserCheck,
  FaInfoCircle,
  FaCopy,
  FaEdit,
  FaUsers
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
  STUDENT: 'STUDENT',
  ADMISSION_OFFICER: 'ADMISSION_OFFICER',
  PRINCIPAL: 'PRINCIPAL'
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

const DOCUMENT_VERIFICATION_STATUS = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

const DOC_VERIFICATION_CONFIG = {
  [DOCUMENT_VERIFICATION_STATUS.VERIFIED]: { label: "Verified", color: COLORS.success, bg: "rgba(16, 185, 129, 0.1)", icon: FaCheckCircle },
  [DOCUMENT_VERIFICATION_STATUS.REJECTED]: { label: "Rejected", color: COLORS.danger, bg: "rgba(239, 68, 68, 0.1)", icon: FaTimesCircle },
  [DOCUMENT_VERIFICATION_STATUS.PENDING]: { label: "Pending", color: COLORS.warning, bg: "rgba(245, 158, 11, 0.1)", icon: FaClock },
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
  const parts = filePath.split(/[\\/]/);
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
      <div className="info-row-icon" style={{ color: iconColor, backgroundColor: `${iconColor}17` }}>
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
function DocumentCard({
  label,
  path,
  icon,
  onView,
  documentId,
  mandatory,
  isUploaded,
  verificationStatus = "PENDING",
  rejectionReason,
  canAct = false,
  onVerify,
  onReject,
  isVerifying = false,
  isRejecting = false,
}) {
  const fileName = getFileName(path);

  const verifyConfig =
    DOC_VERIFICATION_CONFIG[verificationStatus] || DOC_VERIFICATION_CONFIG.PENDING;
  const VerifyIcon = verifyConfig.icon;

  const canVerifyNow = canAct && isUploaded && verificationStatus !== "VERIFIED";

  return (
    <div className={`document-card-enterprise ${!isUploaded ? "document-card-empty" : ""}`}>
      <div className="document-card-header">
        <div className="document-icon" style={{ color: COLORS.primary.accent }}>
          {icon}
        </div>
        <div className="document-label">
          {label}
          <span className={`doc-badge ${mandatory ? 'doc-badge-required' : 'doc-badge-optional'}`}>
            {mandatory ? 'Required' : 'Optional'}
          </span>
        </div>
      </div>
      <div className="document-card-body">
        <div className="document-filename" title={fileName}>
          {isUploaded ? (fileName || 'Document') : 'Not uploaded'}
        </div>

        {isUploaded && (
          <button
            className="btn-view-document"
            onClick={() => onView(path, documentId)}
            aria-label={`View ${label}`}
          >
            <FaEye className="me-1" />
            View
          </button>
        )}

        {/* 📋 Verification status badge */}
        {isUploaded && (
          <span
            className="doc-verification-badge"
            title={
              verificationStatus === "REJECTED" && rejectionReason
                ? `Rejected: ${rejectionReason}`
                : verifyConfig.label
            }
            style={{
              backgroundColor: verifyConfig.bg,
              color: verifyConfig.color,
            }}
          >
            <VerifyIcon className="doc-verification-icon" />
            {verifyConfig.label}
          </span>
        )}

        {/* ✨ Per-document Verify / Reject actions (College Admin only, PENDING student) */}
        {canVerifyNow && (
          <div className="doc-verification-actions">
            <button
              className="btn-verify-document"
              onClick={() => onVerify(documentId)}
              disabled={isVerifying}
              aria-label={`Verify ${label}`}
            >
              <FaCheckCircle className="me-1" />
              {isVerifying ? "Verifying..." : "Verify"}
            </button>
            <button
              className="btn-reject-document"
              onClick={() => onReject(documentId)}
              disabled={isRejecting === documentId}
              aria-label={`Reject ${label}`}
            >
              <FaTimesCircle className="me-1" />
              {isRejecting === documentId ? "Rejecting..." : "Reject"}
            </button>
          </div>
        )}
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
        <div className="skeleton skeleton-subtitle" style={{ width: '200px', height: '18px', marginTop: '10px' }}></div>
      </div>

      <div className="stats-grid-enterprise">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-card" style={{ height: '120px' }}></div>
        ))}
      </div>

      <div className="content-grid-enterprise">
        {[1, 2, 3].map(i => (
          <div key={i} className="content-card-enterprise">
            <div className="skeleton" style={{ width: '200px', height: '24px', margin: '1.5rem' }}></div>
            <div className="skeleton" style={{ width: 'calc(100% - 3rem)', height: '160px', margin: '0 1.5rem 1.5rem' }}></div>
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

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function ViewStudent() {
  const { user } = useContext(AuthContext);
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { canEdit, isCollegeAdmin } = useRole();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [parentAccountDetails, setParentAccountDetails] = useState(null);
   const [showParentDetailsModal, setShowParentDetailsModal] = useState(false);
   const [documentConfig, setDocumentConfig] = useState([]);
   const [showRemoveDivisionConfirm, setShowRemoveDivisionConfirm] = useState(false);

  // 📋 Document verification (admissions workflow)
  const [verifyingDocId, setVerifyingDocId] = useState(null);
  const [rejectingDocId, setRejectingDocId] = useState(null);
  const [showDocRejectModal, setShowDocRejectModal] = useState(false);
  const [docRejectReason, setDocRejectReason] = useState("");

  // 🎓 Division assignment workflow
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  const [validDivisions, setValidDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [assigningDivision, setAssigningDivision] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(false);

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

  /* ================= SECURITY & VALIDATION ================= */
  const shouldRedirectLogin = !user;
  const shouldRedirectRole =
    !!user &&
    user.role !== USER_ROLES.COLLEGE_ADMIN &&
    user.role !== USER_ROLES.ADMISSION_OFFICER &&
    user.role !== USER_ROLES.PRINCIPAL;

  const isIdValid = useMemo(() => {
    if (!studentId) return false;
    return isValidObjectId(studentId);
  }, [studentId]);

  /* ================= FETCH STUDENT ================= */
  const fetchStudent = useCallback(async () => {
    if (!isIdValid) {
      setError({ message: ERROR_MESSAGES.INVALID_ID, statusCode: 400 });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/students/registered/${studentId}`);
      const studentData = res.data?.student || res.data;
      setStudent(studentData);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const specificError = backendMessage || HTTP_ERROR_MAP[statusCode] || ERROR_MESSAGES.LOAD_FAILED;

      logger.error("Error fetching student:", statusCode, errorCode);

      setError({
        message: specificError,
        statusCode,
        errorCode,
      });
    } finally {
      setLoading(false);
    }
  }, [studentId, isIdValid]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  useEffect(() => {
    const fetchDocumentConfig = async () => {
      if (!student?.college_id?.code) return;
      try {
        const res = await api.get(`/document-config/${student.college_id.code}`);
        setDocumentConfig(res.data?.documents || []);
      } catch (err) {
        logger.error("Error fetching document config:", err);
        setDocumentConfig([]);
      }
    };

    if (student) {
      fetchDocumentConfig();
    }
  }, [student]);

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
    const seenTypes = new Set();

    const configDocs = documentConfig.length > 0
      ? documentConfig.filter(doc => doc.enabled)
      : [];

    configDocs.forEach(doc => {
      seenTypes.add(doc.type);
      const uploadedDoc = student.documents?.[doc.type];
      docs.push({
        label: doc.label,
        icon: <FaFileAlt />,
        type: doc.type,
        mandatory: doc.mandatory || false,
        isUploaded: !!uploadedDoc,
        documentId: uploadedDoc?.documentId || null,
        path: uploadedDoc?.downloadUrl || null,
        verificationStatus: uploadedDoc?.verificationStatus || "PENDING",
        verifiedAt: uploadedDoc?.verifiedAt || null,
        verifiedBy: uploadedDoc?.verifiedBy?.name || null,
        rejectedAt: uploadedDoc?.rejectedAt || null,
        rejectedBy: uploadedDoc?.rejectedBy?.name || null,
        rejectionReason: uploadedDoc?.rejectionReason || null,
      });
    });

    if (configDocs.length === 0 && student.documents) {
      Object.keys(student.documents).forEach(type => {
        const uploadedDoc = student.documents[type];
        docs.push({
          label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          icon: <FaFileAlt />,
          type: type,
          mandatory: false,
          isUploaded: !!uploadedDoc,
          documentId: uploadedDoc?.documentId || null,
          path: uploadedDoc?.downloadUrl || null,
          verificationStatus: uploadedDoc?.verificationStatus || "PENDING",
          verifiedAt: uploadedDoc?.verifiedAt || null,
          verifiedBy: uploadedDoc?.verifiedBy?.name || null,
          rejectedAt: uploadedDoc?.rejectedAt || null,
          rejectedBy: uploadedDoc?.rejectedBy?.name || null,
          rejectionReason: uploadedDoc?.rejectionReason || null,
        });
      });
    } else {
      Object.keys(student.documents || {}).forEach(type => {
        if (!seenTypes.has(type)) {
          const uploadedDoc = student.documents[type];
          docs.push({
            label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            icon: <FaFileAlt />,
            type: type,
            mandatory: false,
            isUploaded: !!uploadedDoc,
            documentId: uploadedDoc?.documentId || null,
            path: uploadedDoc?.downloadUrl || null,
            verificationStatus: uploadedDoc?.verificationStatus || "PENDING",
            verifiedAt: uploadedDoc?.verifiedAt || null,
            verifiedBy: uploadedDoc?.verifiedBy?.name || null,
            rejectedAt: uploadedDoc?.rejectedAt || null,
            rejectedBy: uploadedDoc?.rejectedBy?.name || null,
            rejectionReason: uploadedDoc?.rejectionReason || null,
          });
        }
      });
    }

    return docs;
  }, [student, documentConfig]);

  /* ================= DOCUMENT VERIFICATION DERIVED STATE ================= */
  const canVerifyDocs = useMemo(
    () => canEdit('students') && student?.status === STUDENT_STATUS.PENDING,
    [student, canEdit]
  );

  // Required (enabled + mandatory) document types for this college.
  const requiredDocTypes = useMemo(
    () =>
      (documentConfig || [])
        .filter((doc) => doc.enabled && doc.mandatory)
        .map((doc) => doc.type),
    [documentConfig]
  );

  // True only when every required document has a VERIFIED upload.
  const allRequiredDocsVerified = useMemo(() => {
    if (!student) return false;
    if (requiredDocTypes.length === 0) return true;
    return requiredDocTypes.every(
      (type) => student.documents?.[type]?.verificationStatus === "VERIFIED"
    );
  }, [student, requiredDocTypes]);

  // List of required doc labels whose upload is not yet verified.
  const unverifiedRequiredDocs = useMemo(() => {
    if (!student || requiredDocTypes.length === 0) return [];
    const labelMap = new Map(
      (documentConfig || []).map((doc) => [doc.type, doc.label])
    );
    return requiredDocTypes
      .filter(
        (type) => student.documents?.[type]?.verificationStatus !== "VERIFIED"
      )
      .map((type) => labelMap.get(type) || type);
  }, [student, requiredDocTypes, documentConfig]);

  const requiredVerifiedCount = useMemo(() => {
    if (!student || requiredDocTypes.length === 0) return 0;
    return requiredDocTypes.filter(
      (type) => student.documents?.[type]?.verificationStatus === "VERIFIED"
    ).length;
  }, [student, requiredDocTypes]);

  /* ================= ACTION HANDLERS ================= */
  const handleViewDocument = useCallback((path, documentId) => {
    let url = null;

    if (documentId) {
      url = getDocumentViewUrl(documentId);
    } else if (path) {
      const fileName = getFileName(path);
      if (fileName) {
        url = `${api.defaults.baseURL}/students/documents/${fileName}`;
      }
    }

    if (!url) {
      toast.error("Document not available for viewing");
      return;
    }
    window.open(url, "_blank");
  }, []);

  const handleApproveClick = useCallback(() => {
    setShowApproveConfirm(true);
  }, []);

  const handleApprove = useCallback(async () => {
    try {
      setApproving(true);
      const response = await api.put(`/students/${studentId}/approve`);

      const approvalMsg = response.data.message || "Admission offer made";
      toast.success(approvalMsg, {
        position: "top-right",
        autoClose: response.data.emailDelivered ? 3000 : 5000,
      });

      if (response.data.temporaryPassword) {
        toast.info(
          `Temporary password: ${response.data.temporaryPassword}`,
          { position: "top-right", autoClose: 8000 },
        );
      }

      if (response.data.emailError) {
        toast.warning(
          `Email delivery issue: ${response.data.emailError}`,
          { position: "top-right", autoClose: 6000 },
        );
      }

      // Show parent account creation info if any parents were created
      if (response.data.parentAccounts && response.data.parentAccounts.created > 0) {
        // Show modal with parent account details
        setParentAccountDetails(response.data.parentAccounts);
        setShowParentDetailsModal(true);
      } else {
        navigate("/students/approve", { state: { refresh: true } });
      }

      setShowApproveConfirm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || ERROR_MESSAGES.APPROVE_FAILED);
    } finally {
      setApproving(false);
    }
  }, [studentId, navigate]);

  const handleRejectClick = useCallback(() => {
    setRejectionReason('');
    setShowRejectModal(true);
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!rejectionReason.trim()) {
      toast.warning("Please enter a rejection reason");
      return;
    }
    try {
      setRejecting(true);
      setShowRejectModal(false);
      await api.put(`/students/${studentId}/reject`, {
        reason: rejectionReason.trim()
      });
      toast.success("Student rejected successfully");
      fetchStudent();
    } catch (err) {
      toast.error(err.response?.data?.message || ERROR_MESSAGES.REJECT_FAILED);
    } finally {
      setRejecting(false);
    }
  }, [studentId, rejectionReason, fetchStudent]);

  /* ================= DOCUMENT VERIFICATION HANDLERS ================= */
  const handleVerifyDocument = useCallback(
    async (documentId) => {
      try {
        setVerifyingDocId(documentId);
        const response = await api.put(
          `/students/${studentId}/documents/${documentId}/verify`
        );
        toast.success(
          response.data.message || "Document verified successfully",
          { position: "top-right", autoClose: 3000 }
        );
        fetchStudent();
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to verify document"
        );
      } finally {
        setVerifyingDocId(null);
      }
    },
    [studentId, fetchStudent]
  );

  const openDocReject = useCallback((documentId) => {
    setRejectingDocId(documentId);
    setDocRejectReason("");
    setShowDocRejectModal(true);
  }, []);

  const handleRejectDocument = useCallback(async () => {
    if (!docRejectReason.trim()) {
      toast.warning("Please enter a rejection reason");
      return;
    }
    try {
      setShowDocRejectModal(false);
      await api.put(
        `/students/${studentId}/documents/${rejectingDocId}/reject`,
        { reason: docRejectReason.trim() }
      );
      toast.success("Document rejected successfully", {
        position: "top-right",
        autoClose: 3000,
      });
      fetchStudent();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject document");
    } finally {
      setRejectingDocId(null);
      setDocRejectReason("");
    }
  }, [studentId, docRejectReason, rejectingDocId, fetchStudent]);

  /* ================= DIVISION ASSIGNMENT HANDLERS ================= */
  const handleOpenDivisionModal = useCallback(async () => {
    setShowDivisionModal(true);
    setSelectedDivision(student?.division || "");
    setLoadingDivisions(true);
    try {
      const res = await api.get(`/students/${studentId}/valid-divisions`);
      const divisions = Array.isArray(res.data) ? res.data : [];
      setValidDivisions(divisions);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load valid divisions");
      setValidDivisions([]);
    } finally {
      setLoadingDivisions(false);
    }
  }, [studentId, student?.division]);

  const handleAssignDivision = useCallback(async () => {
    // If selecting "No Division" while a division exists, require explicit confirmation
    if (selectedDivision === "" && student?.division) {
      setShowRemoveDivisionConfirm(true);
      return;
    }

    // If no division is selected and none exists, nothing to change
    if (selectedDivision === "" && !student?.division) {
      setShowDivisionModal(false);
      return;
    }

    try {
      setAssigningDivision(true);
      const payload = {
        division: selectedDivision || null,
      };
      await api.put(`/students/${studentId}`, payload);
      toast.success("Division assigned successfully", {
        position: "top-right",
        autoClose: 3000,
      });
      setShowDivisionModal(false);
      fetchStudent();
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to assign division";
      if (err.response?.data?.code === "INVALID_DIVISION") {
        toast.error(message, { autoClose: 6000 });
      } else {
        toast.error(message);
      }
    } finally {
      setAssigningDivision(false);
    }
  }, [studentId, selectedDivision, student?.division, fetchStudent]);

  const handleConfirmRemoveDivision = useCallback(async () => {
    try {
      setAssigningDivision(true);
      await api.put(`/students/${studentId}`, { division: null });
      toast.success("Division removed successfully", {
        position: "top-right",
        autoClose: 3000,
      });
      setShowDivisionModal(false);
      setShowRemoveDivisionConfirm(false);
      fetchStudent();
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to remove division";
      toast.error(message);
    } finally {
      setAssigningDivision(false);
    }
  }, [studentId, fetchStudent]);

  /* ================= RENDER GUARDS (after all hooks) ================= */
  if (shouldRedirectLogin) {
    return <Navigate to="/login" replace />;
  }
  if (shouldRedirectRole) {
    return <Navigate to="/dashboard" replace />;
  }
  if (loading) {
    return <SkeletonLoader />;
  }

  if (error) {
    return (
      <ApiError
        title="Student Profile Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchStudent}
      />
    );
  }

  if (!student) {
    return (
      <ApiError
        title="Student Profile Error"
        message={ERROR_MESSAGES.NOT_FOUND}
        statusCode={404}
      />
    );
  }

  return (
    <div className="view-student-page erp-page erp-viewport-min-100">
      {/* ================= PAGE HEADER ================= */}
      <div className="page-header-enterprise">
        <div className="header-gradient-overlay"></div>
        <div className="header-content">
          <div className="header-branding">
            <div className="header-logo-wrapper">
              <img
                src="/novaa.png"
                alt="NOVAA"
                className="header-logo-image"
                // No loading="lazy" - header logo is visible on page load
              />
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
              {isCollegeAdmin && ["APPROVED", "OFFER_MADE", "SEAT_CONFIRMED"].includes(student.status) && (
                <button
                  className="btn-assign-division"
                  onClick={handleOpenDivisionModal}
                  title="Assign Division"
                >
                  <FaEdit /> Assign Division
                </button>
              )}
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
              <div className="info-row-enterprise">
                <div className="info-row-icon" style={{ color: student.division ? COLORS.success : COLORS.warning, backgroundColor: `${student.division ? COLORS.success : COLORS.warning}17` }}>
                  <FaUsers />
                </div>
                <div className="info-row-content">
                  <div className="info-row-label">Division</div>
                  {student.division ? (
                    <div className="info-row-value">{student.division}</div>
                  ) : (
                    <div className="division-not-assigned-warning">
                      <FaExclamationTriangle className="division-warning-icon" />
                      <span>Not Assigned</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

           {/* Document Verification Summary */}
           {canVerifyDocs && requiredDocTypes.length > 0 && (
             <div className="content-card-enterprise doc-verification-summary">
               <div className="card-header-enterprise">
                 <div className="card-title-wrapper">
                   <FaClipboardCheck className="card-title-icon" />
                   <h3 className="card-title">Document Verification</h3>
                 </div>
                 <span className="card-badge">
                   {requiredVerifiedCount}/{requiredDocTypes.length} Verified
                 </span>
               </div>
               <div className="card-body-enterprise">
                 <div className="doc-verification-progress">
                   <div
                     className="doc-verification-progress-bar"
                     style={{
                       width: `${(requiredVerifiedCount / requiredDocTypes.length) * 100}%`,
                     }}
                   />
                 </div>
                 {allRequiredDocsVerified ? (
                   <div className="doc-verification-ok">
                     <FaCheckCircle className="doc-verification-ok-icon" />
                     <span>All required documents verified. You may now approve this student.</span>
                   </div>
                 ) : (
                   <div className="doc-verification-warning">
                     <FaExclamationTriangle className="doc-verification-warning-icon" />
                     <span>
                       Verify the remaining {unverifiedRequiredDocs.length} required document
                       {unverifiedRequiredDocs.length !== 1 ? "s" : ""} before approval.
                     </span>
                     <ul className="doc-verification-warning-list">
                       {unverifiedRequiredDocs.map((label) => (
                         <li key={label}>{label}</li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
             </div>
           )}

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
                   {uploadedDocuments.map((doc) => (
                     <DocumentCard
                       key={doc.type}
                       label={doc.label}
                       path={doc.path}
                       icon={doc.icon}
                       documentId={doc.documentId}
                       onView={handleViewDocument}
                       mandatory={doc.mandatory}
                       isUploaded={doc.isUploaded}
                       verificationStatus={doc.verificationStatus}
                       rejectionReason={doc.rejectionReason}
                       canAct={canVerifyDocs}
                       onVerify={handleVerifyDocument}
                       onReject={openDocReject}
                       isVerifying={verifyingDocId === doc.documentId}
                       isRejecting={rejectingDocId === doc.documentId}
                     />
                   ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

       {/* ================= STATUS ACTION CARD ================= */}
       {student.status === STUDENT_STATUS.PENDING && canEdit('students') && (
         <div className="action-card-enterprise">
           <div className="action-card-header">
             <div className="action-card-title-wrapper">
               <FaClipboardCheck className="action-card-icon" />
               <h3 className="action-card-title">Student Verification</h3>
             </div>
             <p className="action-card-subtitle">Review and approve or reject this student's registration</p>
           </div>
            
              <div className="action-card-body">
               {requiredDocTypes.length > 0 && !allRequiredDocsVerified && (
                 <div className="doc-verification-gate-warning">
                   <FaExclamationTriangle className="doc-verification-gate-icon" />
                   <span>
                     Verify all required documents before approving. Backend enforcement is active.
                   </span>
                 </div>
               )}
               <div className="action-card-buttons">
                <button
                  className="btn-approve-enterprise"
                  onClick={handleApproveClick}
                  disabled={
                    approving ||
                    (requiredDocTypes.length > 0 && !allRequiredDocsVerified)
                  }
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
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={handleApprove}
        title="Approve Student"
        message="Are you sure you want to approve this student? This action will grant them full access to the system and cannot be undone."
        type="success"
        confirmText="Approve"
        cancelText="Cancel"
        isLoading={approving}
      />

      <ConfirmModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleRejectSubmit}
        title="Reject Student"
        message="Please enter the reason for rejecting this student's registration:"
        type="danger"
        confirmText="Reject"
        cancelText="Cancel"
        isLoading={rejecting}
        customContent={
          <textarea
            className="reject-reason-textarea"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason (required)..."
            rows={4}
            autoFocus
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              marginTop: '1rem'
            }}
          />
        }
      />

      {/* ================= DOCUMENT REJECTION MODAL ================= */}
      <ConfirmModal
        isOpen={showDocRejectModal}
        onClose={() => setShowDocRejectModal(false)}
        onConfirm={handleRejectDocument}
        title="Reject Document"
        message="Please enter the reason for rejecting this document:"
        type="danger"
        confirmText="Reject Document"
        cancelText="Cancel"
        isLoading={!!rejectingDocId}
        customContent={
          <textarea
            className="reject-reason-textarea"
            value={docRejectReason}
            onChange={(e) => setDocRejectReason(e.target.value)}
            placeholder="Enter rejection reason (required)..."
            rows={4}
            autoFocus
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "2px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "0.9375rem",
              fontFamily: "inherit",
              resize: "vertical",
              marginTop: "1rem",
            }}
          />
        }
      />

       {/* ================= DIVISION ASSIGNMENT MODAL ================= */}
       {showDivisionModal && (
         <div className="division-modal-overlay" onClick={() => setShowDivisionModal(false)}>
           <div className="division-modal" onClick={(e) => e.stopPropagation()}>
             <div className="division-modal-header">
               <div className="division-modal-title-wrapper">
                 <FaEdit className="division-modal-icon" />
                 <h3 className="division-modal-title">Assign Division</h3>
               </div>
               <button
                 className="division-modal-close"
                 onClick={() => setShowDivisionModal(false)}
                 aria-label="Close modal"
               >
                 ×
               </button>
             </div>
             <div className="division-modal-body">
               <p className="division-modal-subtitle">
                 Select a valid division for <strong>{student?.fullName}</strong>. 
                 Only divisions matching the student's College, Department, Course, Semester, and Academic Year are shown.
               </p>
               {loadingDivisions ? (
                 <div className="division-loading">
                   <div className="division-spinner" />
                   <span>Loading valid divisions...</span>
                 </div>
               ) : (
                 <div className="division-form-group">
                   <label className="division-label" htmlFor="division-select">
                     Division
                   </label>
                   <select
                     id="division-select"
                     className="division-select"
                     value={selectedDivision}
                     onChange={(e) => setSelectedDivision(e.target.value)}
                     disabled={validDivisions.length === 0}
                   >
                     <option value="">-- No Division / Remove --</option>
                     {validDivisions.map((div) => (
                       <option key={div} value={div}>
                         Division {div}
                       </option>
                     ))}
                   </select>
                   {validDivisions.length === 0 && (
                     <p className="division-warning">
                       No valid divisions found for this student's academic context.
                       Ensure a timetable exists for the student's Department, Course, Semester, and Academic Year.
                     </p>
                   )}
                 </div>
               )}
             </div>
             <div className="division-modal-footer">
               <button
                 className="division-btn-cancel"
                 onClick={() => setShowDivisionModal(false)}
                 disabled={assigningDivision}
               >
                 Cancel
               </button>
               <button
                 className="division-btn-save"
                 onClick={handleAssignDivision}
                 disabled={assigningDivision || loadingDivisions}
               >
                 {assigningDivision ? "Saving..." : "Save Division"}
               </button>
             </div>
           </div>
         </div>
       )}

       {/* ================= REMOVE DIVISION CONFIRMATION MODAL ================= */}
       <ConfirmModal
         isOpen={showRemoveDivisionConfirm}
         onClose={() => setShowRemoveDivisionConfirm(false)}
         onConfirm={handleConfirmRemoveDivision}
         title="Remove Division"
         message={`Remove Division from this student?\n\nThe student cannot be approved until a Division is assigned again.`}
         type="danger"
         confirmText="Remove Division"
         cancelText="Cancel"
         isLoading={assigningDivision}
       />

      {/* ================= PARENT ACCOUNT DETAILS MODAL ================= */}
      {showParentDetailsModal && parentAccountDetails && (
        <div
          className="parent-modal-overlay"
          onClick={() => {
            setShowParentDetailsModal(false);
            setParentAccountDetails(null);
            navigate("/students/approve", { state: { refresh: true } });
          }}
        >
          <div className="parent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="parent-modal-header">
              <div className="parent-modal-title-wrapper">
                <FaUserCheck className="parent-modal-icon" />
                <h3 className="parent-modal-title">Parent Accounts Created</h3>
              </div>
              <button
                className="division-modal-close"
                onClick={() => {
                  setShowParentDetailsModal(false);
                  setParentAccountDetails(null);
                  navigate("/students/approve", { state: { refresh: true } });
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="parent-modal-body">
              <div className="callout callout-info">
                <FaInfoCircle className="callout-icon" />
                <p>
                  <strong>Important:</strong> Parent accounts have been created
                  with temporary passwords. Parents will receive email
                  notifications and must change their passwords on first
                  login.
                </p>
              </div>

              <div className="parent-account-grid">
                {parentAccountDetails.parents.map((parent, index) => (
                  <div key={index} className="parent-account-card">
                    <div className="parent-account-card-header">
                      <FaUser />
                      <span>
                        {parent.relation.charAt(0).toUpperCase() +
                          parent.relation.slice(1)}{" "}
                        Account
                      </span>
                    </div>
                    <div className="parent-account-card-body">
                      <div className="parent-account-row">
                        <span className="parent-account-key">Email</span>
                        <span className="parent-account-value">
                          {parent.email}
                        </span>
                      </div>
                      <div className="parent-account-row">
                        <span className="parent-account-key">
                          Temp. Password
                        </span>
                        <code className="parent-account-code">
                          {parent.tempPassword}
                        </code>
                      </div>
                      <p className="parent-account-note">
                        <FaExclamationTriangle />
                        Password must be changed on first login
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="callout callout-warning">
                <FaExclamationTriangle className="callout-icon" />
                <p>
                  <strong>Security note:</strong> Please securely communicate
                  these temporary passwords to the respective parents. The
                  passwords are also sent via email to the parent accounts.
                </p>
              </div>
            </div>
            <div className="parent-modal-footer">
              <button
                type="button"
                className="division-btn-cancel"
                onClick={() => {
                  setShowParentDetailsModal(false);
                  setParentAccountDetails(null);
                  navigate("/students/approve", { state: { refresh: true } });
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="division-btn-save"
                onClick={() => {
                  // Copy all parent details to clipboard
                  const details = parentAccountDetails.parents
                    .map(p => `${p.relation.toUpperCase()}: ${p.email} - Password: ${p.tempPassword}`)
                    .join('\n');
                  navigator.clipboard.writeText(details);
                  toast.success("Parent account details copied to clipboard!");
                }}
              >
                <FaCopy /> Copy All Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DESIGN SYSTEM CSS ================= */}
      <style>
        {`
        /* =====================================================
           ENTERPRISE DESIGN SYSTEM - View Student Page
           ===================================================== */

        * { box-sizing: border-box; }

        .view-student-page {
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        /* Page Header */
        .page-header-enterprise {
          position: relative;
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 50%, #1a5a6a 100%);
          border-radius: 20px;
          padding: 1.85rem 2rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 32px rgba(15, 58, 74, 0.26);
          overflow: hidden;
          border: 1px solid rgba(79, 195, 247, 0.15);
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          position: relative;
          z-index: 2;
        }
        
        .header-branding {
          display: flex;
          align-items: center;
          gap: 1.1rem;
          min-width: 0;
        }
        
        .header-logo-wrapper {
          flex-shrink: 0;
          width: 58px;
          height: 58px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(79, 195, 247, 0.3);
          box-shadow: 0 4px 16px rgba(79, 195, 247, 0.2);
          padding: 0.5rem;
          overflow: hidden;
        }
        
        .header-logo-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        
        .header-text { color: #ffffff; min-width: 0; }
        
        .page-title {
          font-size: 1.55rem;
          font-weight: 700;
          margin: 0 0 0.2rem 0;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        .page-subtitle {
          font-size: 0.9rem;
          color: rgba(230, 242, 245, 0.85);
          margin: 0;
          font-weight: 400;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }
        
        .btn-back-enterprise {
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.22);
          padding: 0.65rem 1.15rem;
          border-radius: 11px;
          font-weight: 600;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }
        
        .btn-back-enterprise:hover {
          background: rgba(255, 255, 255, 0.24);
          border-color: rgba(255, 255, 255, 0.32);
          transform: translateY(-2px);
        }
        
        .btn-icon { font-size: 0.875rem; }
        
        .header-gradient-overlay {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 18% 40%, rgba(79, 195, 247, 0.14) 0%, transparent 50%),
            radial-gradient(circle at 85% 90%, rgba(79, 195, 247, 0.1) 0%, transparent 55%);
          pointer-events: none;
        }
        
        /* Status Badge */
        .status-badge-enterprise {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          background: rgba(255, 255, 255, 0.92) !important;
        }
        
        .status-icon { font-size: 0.85rem; }
        
        /* Stats Grid */
        .stats-grid-enterprise {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.5rem;
          animation: enterFade 0.35s ease both;
        }
        
        .stat-card-enterprise {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .stat-card-enterprise:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
        }
        
        .stat-card-body {
          padding: 1.3rem 1.4rem;
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        
        .stat-card-icon {
          width: 50px;
          height: 50px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        
        .stat-card-enterprise:hover .stat-card-icon { transform: scale(1.08); }
        
        .stat-card-content { flex: 1; min-width: 0; }
        
        .stat-card-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.35rem;
        }
        
        .stat-card-value {
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .stat-card-sub {
          font-size: 0.78rem;
          color: #9ca3af;
          font-weight: 500;
          margin-top: 0.2rem;
        }
        
        /* Content Grid */
        .content-grid-enterprise {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          align-items: start;
        }
        
        .content-column { min-width: 0; }
        
        /* Content Card */
        .content-card-enterprise {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.05);
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        
        .card-header-enterprise {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          padding: 1.1rem 1.4rem;
          border-bottom: 1px solid #f3f4f6;
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.025) 0%, rgba(19, 73, 82, 0.025) 100%);
          flex-wrap: wrap;
        }
        
        .card-title-wrapper { display: flex; align-items: center; gap: 0.7rem; }
        
        .card-title-icon {
          font-size: 1.05rem;
          color: #0f3a4a;
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: rgba(79, 195, 247, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .card-title {
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        
        .card-badge {
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 100%);
          color: #ffffff;
          padding: 0.32rem 0.8rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        
        .card-body-enterprise { padding: 0.25rem 1.4rem 0.75rem; }
        
        /* Info Row */
        .info-row-enterprise {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding: 0.85rem 0;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .info-row-enterprise:last-child { border-bottom: none; }
        
        .info-row-icon {
          font-size: 1rem;
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        
        .info-row-content { flex: 1; min-width: 0; }
        
        .info-row-label {
          font-size: 0.76rem;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 0.2rem;
        }
        
         .info-row-value {
           font-size: 0.9rem;
           color: #111827;
           font-weight: 600;
           word-break: break-word;
         }

         .division-not-assigned-warning {
           display: inline-flex;
           align-items: center;
           gap: 0.4rem;
           font-size: 0.85rem;
           color: #c2410c;
           font-weight: 600;
           background: #fff7ed;
           padding: 0.35rem 0.75rem;
           border-radius: 6px;
           border: 1px solid #fed7aa;
         }

         .division-warning-icon {
           font-size: 0.85rem;
           color: #f59e0b;
         }
        
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1.25rem; }
        .info-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1.25rem; }
        
        /* Document Card */
        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 1rem;
          padding-bottom: 0.5rem;
        }
        
        .document-card-enterprise {
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border: 1px solid #e5e7eb;
          border-radius: 13px;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        
        .document-card-enterprise:hover {
          border-color: #0f3a4a;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }

        .document-card-empty { opacity: 0.7; }
        
        .document-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.9rem 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .document-icon {
          font-size: 1.1rem;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(79, 195, 247, 0.12);
          border-radius: 10px;
          flex-shrink: 0;
        }
        
        .document-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #374151;
          line-height: 1.4;
        }
        
        .document-card-body {
          padding: 0.9rem 1rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        
        .document-filename {
          font-size: 0.8rem;
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
          font-size: 0.8rem;
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
        
        .doc-badge {
          display: inline-block;
          font-size: 0.64rem;
          font-weight: 700;
          padding: 0.14rem 0.5rem;
          border-radius: 9999px;
          margin-left: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .doc-badge-required { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
        .doc-badge-optional { background: rgba(107, 114, 128, 0.1); color: #6b7280; }

         /* Document Verification Summary */
         .doc-verification-summary { margin-bottom: 1.5rem; }

         .doc-verification-progress {
           width: 100%;
           height: 8px;
           background: #e5e7eb;
           border-radius: 4px;
           overflow: hidden;
           margin: 0.5rem 0 0.85rem;
         }

         .doc-verification-progress-bar {
           height: 100%;
           background: linear-gradient(90deg, #10b981 0%, #059669 100%);
           border-radius: 4px;
           transition: width 0.3s ease;
         }

         .doc-verification-ok, .doc-verification-warning {
           display: flex;
           align-items: flex-start;
           gap: 0.5rem;
           font-size: 0.83rem;
           margin-bottom: 0.75rem;
         }

         .doc-verification-ok-icon, .doc-verification-warning-icon {
           font-size: 1.1rem;
           margin-top: 0.1rem;
           flex-shrink: 0;
         }

         .doc-verification-ok { color: #064e3b; }
         .doc-verification-ok-icon { color: #10b981; }

         .doc-verification-warning {
           color: #78350f;
           background: rgba(245, 158, 11, 0.08);
           padding: 0.65rem 0.8rem;
           border: 1px solid rgba(245, 158, 11, 0.2);
           border-radius: 9px;
           flex-direction: column;
           gap: 0.3rem;
         }

         .doc-verification-warning-icon { color: #f59e0b; }

         .doc-verification-warning-list {
           list-style: disc inside;
           margin: 0.3rem 0 0 0.25rem;
           padding-left: 0;
         }

         /* Per-document verification badge + actions */
         .doc-verification-badge {
           display: inline-flex;
           align-items: center;
           gap: 0.25rem;
           font-size: 0.68rem;
           font-weight: 700;
           padding: 0.2rem 0.5rem;
           border-radius: 9999px;
           text-transform: uppercase;
           letter-spacing: 0.03em;
           width: fit-content;
         }

         .doc-verification-icon { font-size: 0.78rem; }

         .doc-verification-actions { display: flex; gap: 0.5rem; }

         .btn-verify-document, .btn-reject-document {
           flex: 1 1 auto;
           border: none;
           padding: 0.4rem 0.6rem;
           border-radius: 8px;
           font-size: 0.75rem;
           font-weight: 700;
           display: flex;
           align-items: center;
           justify-content: center;
           gap: 0.25rem;
           cursor: pointer;
           transition: all 0.2s ease;
         }

         .btn-verify-document { background: rgba(16, 185, 129, 0.12); color: #065f46; }
         .btn-verify-document:hover:not(:disabled) { background: rgba(16, 185, 129, 0.2); }
         .btn-reject-document { background: rgba(239, 68, 68, 0.12); color: #7f1d1d; }
         .btn-reject-document:hover:not(:disabled) { background: rgba(239, 68, 68, 0.2); }

         /* Approval gate warning */
         .doc-verification-gate-warning {
           display: flex;
           align-items: flex-start;
           gap: 0.5rem;
           color: #78350f;
           background: rgba(245, 158, 11, 0.08);
           border: 1px solid rgba(245, 158, 11, 0.2);
           border-radius: 9px;
           padding: 0.65rem 0.8rem;
           margin-bottom: 1rem;
           font-size: 0.83rem;
           max-width: 640px;
         }

         .doc-verification-gate-icon { font-size: 1.1rem; color: #f59e0b; margin-top: 0.1rem; flex-shrink: 0; }

         .inline-assign-division-btn {
           background: none;
           border: none;
           color: #0f3a4a;
           font-weight: 700;
           text-decoration: underline;
           cursor: pointer;
           padding: 0;
           font-size: inherit;
           margin-left: 0.25rem;
         }

         .inline-assign-division-btn:hover {
           color: #1a5263;
         }

         /* Action Card */
         .action-card-enterprise {
           background: #ffffff;
           border-radius: 16px;
           box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
           border: 2px solid rgba(15, 58, 74, 0.1);
           overflow: hidden;
           margin-bottom: 1.5rem;
           position: sticky;
           top: 1rem;
           z-index: 10;
         }
        
        .action-card-header {
          padding: 1.35rem 1.5rem;
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.05) 0%, rgba(19, 73, 82, 0.05) 100%);
          border-bottom: 1px solid #f3f4f6;
        }
        
        .action-card-title-wrapper { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.4rem; }
        .action-card-icon { font-size: 1.15rem; color: #0f3a4a; }
        .action-card-title { font-size: 1.05rem; font-weight: 700; color: #111827; margin: 0; }
        .action-card-subtitle { font-size: 0.85rem; color: #6b7280; margin: 0; }
        
        .action-card-body { padding: 1.35rem 1.5rem; }

        .action-card-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        
        .btn-approve-enterprise {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          border: none;
          padding: 0.8rem 1.9rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.28);
        }
        
        .btn-approve-enterprise:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(16, 185, 129, 0.38);
        }
        
        .btn-reject-enterprise {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #ffffff;
          border: none;
          padding: 0.8rem 1.9rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.28);
        }
        
        .btn-reject-enterprise:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(239, 68, 68, 0.38);
        }
        
        .btn-approve-enterprise:disabled, .btn-reject-enterprise:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        /* Meta Info */
        .meta-info-enterprise {
          display: flex;
          justify-content: center;
          gap: 2rem;
          padding: 1.1rem 1.5rem;
          background: #ffffff;
          border-radius: 13px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        
        .meta-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #6b7280; }
        .meta-icon { color: #0f3a4a; }
        
        /* Legacy modal shell kept for compatibility (unused visually now) */
        .modal-message { font-size: 0.9375rem; color: #374151; margin: 0 0 1rem 0; }
        
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
        
        /* Skeleton Loader */
        @keyframes skeleton-loading {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%);
          background-size: 200px 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 12px;
        }
        
        .skeleton-card {
          background: linear-gradient(90deg, #ffffff 0%, #f5f5f5 50%, #ffffff 100%);
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
        
        .error-icon { font-size: 2.5rem; color: #ef4444; }
        .error-title { font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 0.75rem; }
        .error-message { color: #6b7280; font-size: 0.9375rem; line-height: 1.6; margin-bottom: 1.5rem; }
        
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

        @keyframes enterFade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .content-grid-enterprise { grid-template-columns: 1fr; }
        }
        
        @media (max-width: 768px) {
          .view-student-page { padding: 1rem; }
          .page-header-enterprise { padding: 1.4rem; }
          .header-content { flex-direction: column; align-items: flex-start; gap: 1.1rem; }
          .header-branding { width: 100%; }
          .header-actions { width: 100%; justify-content: space-between; }
          .page-title { font-size: 1.35rem; }
          .stats-grid-enterprise { grid-template-columns: 1fr; }
          .action-card-buttons { flex-direction: column; }
          .btn-approve-enterprise, .btn-reject-enterprise { width: 100%; justify-content: center; }
          .info-grid, .info-grid-2 { grid-template-columns: 1fr; }
          .documents-grid { grid-template-columns: 1fr; }
          .meta-info-enterprise { flex-direction: column; gap: 0.75rem; }
        }
        
        /* Print Styles */
        @media print {
          .page-header-enterprise, .action-card-enterprise, .btn-back-enterprise, .no-print {
            display: none !important;
          }
          .view-student-page { background: white; padding: 0; }
          .content-card-enterprise { box-shadow: none; border: 1px solid #ddd; page-break-inside: avoid; }
        }

        /* ================= DIVISION ASSIGNMENT ================= */
        .btn-assign-division {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-assign-division:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.4);
        }

        /* ================= SHARED CUSTOM MODAL SHELL ================= */
        .division-modal-overlay, .parent-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 16px;
          animation: enterFade 0.2s ease both;
        }

        .division-modal, .parent-modal {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        }

        .parent-modal { max-width: 780px; }

        .division-modal-header, .parent-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.2rem 1.5rem;
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
          color: white;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .division-modal-title-wrapper, .parent-modal-title-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .division-modal-icon, .parent-modal-icon { font-size: 1.2rem; color: #3db5e6; }

        .division-modal-title, .parent-modal-title {
          margin: 0;
          font-size: 1.08rem;
          font-weight: 700;
        }

        .division-modal-close {
          background: rgba(255, 255, 255, 0.12);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          font-size: 1.4rem;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }

        .division-modal-close:hover { background: rgba(255, 255, 255, 0.22); }

        .division-modal-body, .parent-modal-body { padding: 1.5rem; }

        .division-modal-subtitle {
          margin: 0 0 1.2rem 0;
          font-size: 0.9rem;
          color: #475569;
          line-height: 1.6;
        }

        .division-loading {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          color: #64748b;
          font-size: 0.9rem;
        }

        .division-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-top-color: #3db5e6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .division-form-group { display: flex; flex-direction: column; gap: 0.5rem; }

        .division-label { font-size: 0.85rem; font-weight: 700; color: #0f3a4a; }

        .division-select {
          width: 100%;
          padding: 0.7rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.9rem;
          background: white;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }

        .division-select:focus {
          outline: none;
          border-color: #3db5e6;
          box-shadow: 0 0 0 0.25rem rgba(61, 181, 230, 0.15);
        }

        .division-warning {
          margin: 0.75rem 0 0 0;
          padding: 0.7rem 1rem;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 8px;
          color: #c2410c;
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .division-modal-footer, .parent-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          position: sticky;
          bottom: 0;
        }

        .division-btn-cancel {
          padding: 0.6rem 1.2rem;
          border: 2px solid #e2e8f0;
          background: white;
          color: #475569;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .division-btn-cancel:hover:not(:disabled) { background: #f1f5f9; border-color: #cbd5e1; }
        .division-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

        .division-btn-save {
          padding: 0.6rem 1.2rem;
          border: none;
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          color: white;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .division-btn-save:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.4);
        }

        .division-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ================= PARENT ACCOUNT DETAILS ================= */
        .callout {
          display: flex;
          gap: 0.7rem;
          padding: 0.85rem 1rem;
          border-radius: 10px;
          font-size: 0.84rem;
          line-height: 1.5;
          margin-bottom: 1.1rem;
        }

        .callout p { margin: 0; }
        .callout-icon { flex-shrink: 0; margin-top: 2px; }
        .callout-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
        .callout-warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; margin-bottom: 0; }

        .parent-account-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1.1rem;
        }

        .parent-account-card { border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; }

        .parent-account-card-header {
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 100%);
          color: white;
          padding: 0.65rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          font-size: 0.83rem;
        }

        .parent-account-card-body { padding: 0.85rem 1rem; }

        .parent-account-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.35rem 0;
          font-size: 0.83rem;
        }

        .parent-account-key { color: #64748b; font-weight: 600; }
        .parent-account-value { color: #111827; font-weight: 600; text-align: right; word-break: break-all; }

        .parent-account-code {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 3px 9px;
          border-radius: 6px;
          font-weight: 700;
          color: #0f3a4a;
        }

        .parent-account-note {
          margin: 0.55rem 0 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.74rem;
          color: #64748b;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        `}
      </style>
    </div>
  );
}