import { useContext, useEffect, useState, useMemo, useCallback } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";
import PropTypes from "prop-types";
import Loading from "../../../components/Loading";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
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
  FaImage,
  FaCopy,
  FaPrint,
  FaExternalLinkAlt,
} from "react-icons/fa";

/* ================= CONSTANTS & CONFIGURATION ================= */
const CONFIG = {
  MAX_RETRY: 3,
  API_ENDPOINTS: {
    APPROVED_STUDENT: (id) => `/students/approved-stud/${id}`,
  },
  GRID_COLUMNS: {
    FEE: 3,
    DETAILS: 2,
    TABLE: 6,
  },
  STATUS: {
    APPROVED: "APPROVED",
    PENDING: "PENDING",
    REJECTED: "REJECTED",
    PAID: "PAID",
    UNPAID: "UNPAID",
  },
};

const ERROR_TYPES = {
  NOT_FOUND: "Student not found or does not exist",
  UNAUTHORIZED: "You do not have permission to view this student",
  NETWORK: "Network error. Please check your internet connection",
  SERVER: "Server error. Please try again later",
  UNKNOWN: "An unexpected error occurred",
};

/* ================= ERROR TYPE DETECTOR ================= */
const getErrorType = (error) => {
  const status = error.response?.status;
  if (status === 404) return ERROR_TYPES.NOT_FOUND;
  if (status === 403 || status === 401) return ERROR_TYPES.UNAUTHORIZED;
  if (!error.response && error.code === "ERR_NETWORK")
    return ERROR_TYPES.NETWORK;
  if (status && status >= 500) return ERROR_TYPES.SERVER;
  return ERROR_TYPES.UNKNOWN;
};

/* ================= UTILITY FUNCTIONS ================= */
const copyToClipboard = async (text, label) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`, {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  } catch {
    toast.error("Failed to copy to clipboard", {
      position: "top-right",
      autoClose: 3000,
    });
  }
};

const printProfile = () => {
  window.print();
};

const getFileName = (filePath) => {
  if (!filePath) return null;
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1];
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "₹ 0";
  return `₹ ${amount.toLocaleString("en-IN")}`;
};

/* ================= REUSABLE INTERNAL COMPONENTS ================= */

/* ---- CopyButton Component ---- */
function CopyButton({ value, label }) {
  return (
    <button
      className="copy-btn"
      onClick={(e) => {
        e.stopPropagation();
        copyToClipboard(value, label);
      }}
      title={`Copy ${label}`}
      aria-label={`Copy ${label} to clipboard`}
      type="button"
    >
      <FaCopy />
    </button>
  );
}

CopyButton.propTypes = {
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

/* ---- StatusBadge Component ---- */
function StatusBadge({ status, type = "default" }) {
  const statusConfig = {
    APPROVED: { class: "status-approved", icon: FaCheckCircle },
    PENDING: { class: "status-pending", icon: FaClock },
    REJECTED: { class: "status-rejected", icon: FaExclamationTriangle },
    PAID: { class: "status-paid", icon: FaCheckCircle },
    UNPAID: { class: "status-unpaid", icon: FaClock },
    default: { class: "status-default", icon: FaInfoCircle },
  };

  const config =
    statusConfig[status] || statusConfig[type] || statusConfig.default;
  const IconComponent = config.icon;

  return (
    <span
      className={`status-badge ${config.class}`}
      role="status"
      aria-label={`Status: ${status}`}
    >
      <IconComponent className="status-icon" aria-hidden="true" />
      {status}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  type: PropTypes.oneOf([
    "APPROVED",
    "PENDING",
    "REJECTED",
    "PAID",
    "UNPAID",
    "default",
  ]),
};

StatusBadge.defaultProps = {
  type: "default",
};

/* ---- EmptyState Component ---- */
// eslint-disable-next-line no-unused-vars
function EmptyState({ icon: Icon, message, subMessage }) {
  return (
    <div className="empty-state" role="status" aria-label="No data available">
      <Icon className="empty-icon" aria-hidden="true" />
      <p className="empty-message">{message}</p>
      {subMessage && <p className="empty-submessage">{subMessage}</p>}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.elementType.isRequired,
  message: PropTypes.string.isRequired,
  subMessage: PropTypes.string,
};

EmptyState.defaultProps = {
  subMessage: null,
};

/* ---- DetailRow Component ---- */
function DetailRow({
  label,
  value,
  icon,
  isEmail = false,
  isMultiline = false,
  isCopyable = false,
}) {
  const displayValue = value || "N/A";

  return (
    <tr className="detail-row">
      <td className="detail-label">
        <span className="detail-label-icon" aria-hidden="true">
          {icon}
        </span>
        {label}
      </td>
      <td
        className={`detail-value ${isEmail ? "email" : ""} ${isMultiline ? "multiline" : ""}`}
      >
        <span className="value-content">{displayValue}</span>
        {isCopyable && value && <CopyButton value={value} label={label} />}
      </td>
    </tr>
  );
}

DetailRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  icon: PropTypes.node.isRequired,
  isEmail: PropTypes.bool,
  isMultiline: PropTypes.bool,
  isCopyable: PropTypes.bool,
};

DetailRow.defaultProps = {
  value: null,
  isEmail: false,
  isMultiline: false,
  isCopyable: false,
};

/* ---- DocumentRow Component ---- */
function DocumentRow({ label, path, icon }) {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  const fileName = getFileName(path);

  return (
    <tr className="detail-row">
      <td className="detail-label">
        <span className="detail-label-icon" aria-hidden="true">
          {icon}
        </span>
        {label}
      </td>
      <td className="detail-value">
        {path ? (
          <a
            href={`${baseUrl}/${path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="document-link"
            aria-label={`View ${label} (opens in new tab)`}
          >
            <FaExternalLinkAlt className="link-icon" aria-hidden="true" />
            {fileName || "View Document"}
          </a>
        ) : (
          <span
            className="document-not-uploaded"
            aria-label="Document not uploaded"
          >
            Not uploaded
          </span>
        )}
      </td>
    </tr>
  );
}

DocumentRow.propTypes = {
  label: PropTypes.string.isRequired,
  path: PropTypes.string,
  icon: PropTypes.node.isRequired,
};

DocumentRow.defaultProps = {
  path: null,
};

/* ---- InfoCard Component ---- */
// eslint-disable-next-line no-unused-vars
function InfoCard({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`erp-card ${className}`}>
      <div className="erp-card-header">
        <h3>
          <Icon className="erp-card-icon" aria-hidden="true" />
          {title}
        </h3>
      </div>
      <div className="erp-card-body">{children}</div>
    </div>
  );
}

InfoCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

InfoCard.defaultProps = {
  className: "",
};

/* ---- FeeCard Component ---- */
function FeeCard({
  label,
  value,
  subtitle,
  variant = "default",
  highlight = false,
}) {
  const variantClasses = {
    default: "",
    total: "total-fee",
    paid: "paid-fee",
    pending: `pending-fee ${highlight ? "highlight" : ""}`,
  };

  return (
    <div className={`fee-item ${variantClasses[variant]}`}>
      <div className="fee-label">{label}</div>
      <div className="fee-value">{value}</div>
      <div className="fee-subtitle">{subtitle}</div>
    </div>
  );
}

FeeCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(["default", "total", "paid", "pending"]),
  highlight: PropTypes.bool,
};

FeeCard.defaultProps = {
  variant: "default",
  highlight: false,
};

/* ---- InstallmentTable Component ---- */
function InstallmentTable({ installments }) {
  if (!installments || installments.length === 0) {
    return (
      <EmptyState
        icon={FaInfoCircle}
        message="No installments available"
        subMessage="Payment schedule will appear here once created"
      />
    );
  }

  return (
    <div className="table-container">
      <table
        className="erp-installments-table"
        role="table"
        aria-label="Payment installments"
      >
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Name</th>
            <th scope="col">Amount</th>
            <th scope="col">Due Date</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {installments.map((inst, index) => (
            <tr key={inst._id}>
              <td>{index + 1}</td>
              <td>{inst.name}</td>
              <td>{formatCurrency(inst.amount)}</td>
              <td>{formatDate(inst.dueDate)}</td>
              <td>
                <StatusBadge
                  status={inst.status}
                  type={inst.status.toLowerCase()}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

InstallmentTable.propTypes = {
  installments: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      amount: PropTypes.number.isRequired,
      dueDate: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

/* ---- Skeleton Components ---- */
function ProfileSkeleton() {
  return (
    <div
      className="erp-skeleton-container"
      role="status"
      aria-label="Loading student profile"
    >
      <div className="skeleton-header">
        <div className="skeleton-avatar" aria-hidden="true" />
        <div className="skeleton-text skeleton-title" />
        <div className="skeleton-text skeleton-subtitle" />
      </div>

      <div className="skeleton-section">
        <div className="skeleton-section-title" />
        <div className="skeleton-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-icon" />
              <div className="skeleton-label" />
              <div className="skeleton-value" />
            </div>
          ))}
        </div>
      </div>

      <div className="skeleton-section">
        <div className="skeleton-section-title" />
        <div className="skeleton-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-icon" />
              <div className="skeleton-label" />
              <div className="skeleton-value" />
            </div>
          ))}
        </div>
      </div>

      <div className="skeleton-section">
        <div className="skeleton-section-title" />
        <div className="skeleton-fee-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-fee-card" />
          ))}
        </div>
      </div>

      <div className="skeleton-section">
        <div className="skeleton-section-title" />
        <div className="skeleton-table">
          <div className="skeleton-table-header">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-header-cell" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-table-row">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="skeleton-cell" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Error Display Component ---- */
function ErrorDisplay({ error, onRetry, onBack, retryCount }) {
  return (
    <motion.div
      className="erp-error-container"
      role="alert"
      aria-live="assertive"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.div
        className="erp-error-icon"
        aria-hidden="true"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <FaExclamationTriangle />
      </motion.div>
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Student Profile Error
      </motion.h3>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {error}
      </motion.p>
      <motion.div
        className="error-actions"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button
          className="erp-btn erp-btn-secondary"
          onClick={onBack}
          type="button"
        >
          <FaArrowLeft className="erp-btn-icon" aria-hidden="true" />
          Go Back
        </button>
        <button
          className="erp-btn erp-btn-primary"
          onClick={onRetry}
          disabled={retryCount >= CONFIG.MAX_RETRY}
          type="button"
          aria-label={`Retry loading (attempt ${retryCount} of ${CONFIG.MAX_RETRY})`}
        >
          <FaSyncAlt className="erp-btn-icon" aria-hidden="true" />
          {retryCount >= CONFIG.MAX_RETRY
            ? "Max Retries"
            : `Retry (${retryCount}/${CONFIG.MAX_RETRY})`}
        </button>
      </motion.div>
    </motion.div>
  );
}

ErrorDisplay.propTypes = {
  error: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  retryCount: PropTypes.number.isRequired,
};

/* ---- Loading Display Component ---- */
function LoadingDisplay() {
  return (
    <motion.div
      className="erp-loading-container"
      role="status"
      aria-label="Loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Loading
        size="lg"
        color="primary"
        text="Loading student profile..."
        variant="spinner"
      />
      <div className="loading-skeleton-wrapper">
        <ProfileSkeleton />
      </div>
    </motion.div>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function ViewApproveStudent() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /* ================= FETCH STUDENT ================= */
  const fetchStudent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(CONFIG.API_ENDPOINTS.APPROVED_STUDENT(id));

      // API returns: { student: {...}, fee: {...} }
      const studentData =
        res.data?.student || (res.data?.fullName ? res.data : null);
      const feeData = res.data?.fee || null;

      // Merge fee data into student object for compatibility
      if (studentData && feeData) {
        studentData.fee = feeData;
      }

      setStudent(studentData);
      setRetryCount(0);
    } catch (fetchError) {
      const errorType = getErrorType(fetchError);
      setError(errorType);
      toast.error(errorType, {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user?.role === "COLLEGE_ADMIN") {
      fetchStudent();
    }
  }, [fetchStudent, user]);

  /* ================= SECURITY CHECK ================= */
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" replace />;

  /* ================= MEMOIZED CALCULATIONS ================= */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const has10thDetails = useMemo(() => {
    if (!student) return false;
    return !!(
      student.sscSchoolName?.trim() ||
      student.sscBoard?.trim() ||
      student.sscPassingYear ||
      student.sscPercentage ||
      student.sscRollNumber?.trim()
    );
  }, [student]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const has12thDetails = useMemo(() => {
    if (!student) return false;
    return !!(
      student.hscSchoolName?.trim() ||
      student.hscBoard?.trim() ||
      student.hscStream ||
      student.hscPassingYear ||
      student.hscPercentage ||
      student.hscRollNumber?.trim()
    );
  }, [student]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const uploadedDocuments = useMemo(() => {
    if (!student) return [];

    const docMap = [
      { key: "sscMarksheetPath", label: "10th Marksheet", icon: <FaFileAlt /> },
      { key: "hscMarksheetPath", label: "12th Marksheet", icon: <FaFileAlt /> },
      { key: "passportPhotoPath", label: "Passport Photo", icon: <FaImage /> },
      {
        key: "categoryCertificatePath",
        label: "Category Certificate",
        icon: <FaFileAlt />,
      },
      {
        key: "incomeCertificatePath",
        label: "Income Certificate",
        icon: <FaFileAlt />,
      },
      {
        key: "characterCertificatePath",
        label: "Character Certificate",
        icon: <FaFileAlt />,
      },
      {
        key: "transferCertificatePath",
        label: "Transfer Certificate",
        icon: <FaFileAlt />,
      },
      { key: "aadharCardPath", label: "Aadhar Card", icon: <FaFileAlt /> },
      {
        key: "entranceExamScorePath",
        label: "Entrance Exam Score",
        icon: <FaFileAlt />,
      },
      {
        key: "migrationCertificatePath",
        label: "Migration Certificate",
        icon: <FaFileAlt />,
      },
      {
        key: "domicileCertificatePath",
        label: "Domicile Certificate",
        icon: <FaFileAlt />,
      },
      {
        key: "casteCertificatePath",
        label: "Caste Certificate",
        icon: <FaFileAlt />,
      },
      {
        key: "nonCreamyLayerCertificatePath",
        label: "Non-Creamy Layer Certificate",
        icon: <FaFileAlt />,
      },
      {
        key: "physicallyChallengedCertificatePath",
        label: "Physically Challenged Certificate",
        icon: <FaFileAlt />,
      },
      {
        key: "sportsQuotaCertificatePath",
        label: "Sports Quota Certificate",
        icon: <FaFileAlt />,
      },
      {
        key: "nriSponsorCertificatePath",
        label: "NRI Sponsor Certificate",
        icon: <FaFileAlt />,
      },
      {
        key: "gapCertificatePath",
        label: "Gap Certificate",
        icon: <FaFileAlt />,
      },
      { key: "affidavitPath", label: "Affidavit", icon: <FaFileAlt /> },
    ];

    return docMap
      .filter(({ key }) => student[key])
      .map(({ label, ...rest }) => ({
        label,
        path: student[docMap.find((d) => d.label === label).key],
        ...rest,
      }));
  }, [student]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const feeData = useMemo(() => {
    if (!student?.fee) return null;

    const fee = student.fee;
    const paidAmount = fee.paidAmount || 0;
    const pendingAmount = fee.totalFee - paidAmount;

    return {
      totalFee: fee.totalFee,
      paidAmount,
      pendingAmount,
      installments: fee.installments || [],
    };
  }, [student?.fee]);

  /* ================= HANDLERS ================= */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleRetry = useCallback(() => {
    if (retryCount < CONFIG.MAX_RETRY) {
      setRetryCount((prev) => prev + 1);
      fetchStudent();
    } else {
      toast.error("Maximum retry attempts reached", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  }, [retryCount, fetchStudent]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handlePrint = useCallback(() => {
    printProfile();
    toast.info("Preparing print view...", {
      position: "top-right",
      autoClose: 1500,
    });
  }, []);

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={handleRetry}
        onBack={handleBack}
        retryCount={retryCount}
      />
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading || !student) {
    return <LoadingDisplay />;
  }

  /* ================= RENDER ================= */
  return (
    <div className="erp-container print-area">
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Approved Students", path: "/students/approve" },
          { label: student.fullName || "Student Profile" },
        ]}
      />

      {/* HEADER WITH STUDENT INFO */}
      <div className="erp-page-header no-print" role="banner">
        <div className="erp-header-content">
          {/* Student Avatar */}
          <div className="student-avatar" aria-hidden="true">
            {(student.fullName || "S").charAt(0).toUpperCase()}
          </div>

          {/* Student Details */}
          <div className="erp-header-text">
            <h1 className="erp-page-title">{student.fullName || "N/A"}</h1>
            <div className="student-meta">
              <span className="meta-item">
                <FaBookOpen className="meta-icon" aria-hidden="true" />
                {student.course_id?.name || "N/A"}
              </span>
              <span className="status-badge status-approved">
                <FaCheckCircle className="status-icon" aria-hidden="true" />
                APPROVED
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={handleBack}
            type="button"
            aria-label="Go back to previous page"
          >
            <FaArrowLeft className="erp-btn-icon" aria-hidden="true" />
            <span>Back to Students</span>
          </button>
          <button
            className="erp-btn erp-btn-primary"
            onClick={handlePrint}
            type="button"
            aria-label="Print student profile"
            title="Print Profile"
          >
            <FaPrint className="erp-btn-icon" aria-hidden="true" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="main-content-grid animate-fade-in">
        {/* LEFT COLUMN - PERSONAL & ACADEMIC DETAILS */}
        <div className="left-column">
          {/* PERSONAL INFORMATION */}
          <InfoCard title="Personal Information" icon={FaUserGraduate}>
            <div className="erp-table-container">
              <table
                className="erp-detail-table"
                role="table"
                aria-label="Personal information"
              >
                <tbody>
                  <DetailRow
                    label="Email Address"
                    value={student.email}
                    icon={<FaEnvelope />}
                    isEmail
                    isCopyable
                  />
                  <DetailRow
                    label="Mobile Number"
                    value={student.mobileNumber}
                    icon={<FaPhone />}
                    isCopyable
                  />
                  <DetailRow
                    label="Gender"
                    value={student.gender}
                    icon={<FaUserGraduate />}
                  />
                  <DetailRow
                    label="Category"
                    value={student.category}
                    icon={<FaBookOpen />}
                  />
                  <DetailRow
                    label="Date of Birth"
                    value={formatDate(student.dateOfBirth)}
                    icon={<FaCalendarAlt />}
                  />
                </tbody>
              </table>
            </div>
          </InfoCard>

          {/* ADDRESS DETAILS */}
          <InfoCard title="Address Details" icon={FaMapMarkerAlt}>
            <div className="erp-table-container">
              <table
                className="erp-detail-table"
                role="table"
                aria-label="Address details"
              >
                <tbody>
                  <DetailRow
                    label="Address"
                    value={student.addressLine}
                    icon={<FaMapMarkerAlt />}
                    isMultiline
                  />
                  <DetailRow
                    label="City"
                    value={student.city}
                    icon={<FaMapMarkerAlt />}
                  />
                  <DetailRow
                    label="State"
                    value={student.state}
                    icon={<FaMapMarkerAlt />}
                  />
                  <DetailRow
                    label="Pincode"
                    value={student.pincode}
                    icon={<FaMapMarkerAlt />}
                    isCopyable
                  />
                </tbody>
              </table>
            </div>
          </InfoCard>

          {/* PARENT / GUARDIAN INFORMATION */}
          <InfoCard title="Parent / Guardian Information" icon={FaUser}>
            <div className="erp-table-container">
              <table
                className="erp-detail-table"
                role="table"
                aria-label="Parent guardian information"
              >
                <tbody>
                  <DetailRow
                    label="Father's Name"
                    value={student.fatherName}
                    icon={<FaUser />}
                  />
                  <DetailRow
                    label="Father's Mobile"
                    value={student.fatherMobile}
                    icon={<FaPhone />}
                    isCopyable
                  />
                  <DetailRow
                    label="Mother's Name"
                    value={student.motherName}
                    icon={<FaUser />}
                  />
                  <DetailRow
                    label="Mother's Mobile"
                    value={student.motherMobile}
                    icon={<FaPhone />}
                    isCopyable
                  />
                </tbody>
              </table>
            </div>
          </InfoCard>

          {/* 10TH (SSC) ACADEMIC DETAILS */}
          {has10thDetails && (
            <InfoCard
              title="10th (SSC) Academic Details"
              icon={FaGraduationCap}
            >
              <div className="erp-table-container">
                <table
                  className="erp-detail-table"
                  role="table"
                  aria-label="10th academic details"
                >
                  <tbody>
                    <DetailRow
                      label="School Name"
                      value={student.sscSchoolName}
                      icon={<FaUniversity />}
                    />
                    <DetailRow
                      label="Board"
                      value={student.sscBoard}
                      icon={<FaUniversity />}
                    />
                    <DetailRow
                      label="Passing Year"
                      value={student.sscPassingYear?.toString()}
                      icon={<FaCalendarAlt />}
                    />
                    <DetailRow
                      label="Percentage / CGPA"
                      value={
                        student.sscPercentage
                          ? `${student.sscPercentage}%`
                          : null
                      }
                      icon={<FaGraduationCap />}
                    />
                    <DetailRow
                      label="Roll Number"
                      value={student.sscRollNumber}
                      icon={<FaBookOpen />}
                      isCopyable
                    />
                  </tbody>
                </table>
              </div>
            </InfoCard>
          )}

          {/* 12TH (HSC) ACADEMIC DETAILS */}
          {has12thDetails && (
            <InfoCard
              title="12th (HSC) Academic Details"
              icon={FaGraduationCap}
            >
              <div className="erp-table-container">
                <table
                  className="erp-detail-table"
                  role="table"
                  aria-label="12th academic details"
                >
                  <tbody>
                    <DetailRow
                      label="School / College Name"
                      value={student.hscSchoolName}
                      icon={<FaUniversity />}
                    />
                    <DetailRow
                      label="Board"
                      value={student.hscBoard}
                      icon={<FaUniversity />}
                    />
                    <DetailRow
                      label="Stream"
                      value={student.hscStream}
                      icon={<FaBookOpen />}
                    />
                    <DetailRow
                      label="Passing Year"
                      value={student.hscPassingYear?.toString()}
                      icon={<FaCalendarAlt />}
                    />
                    <DetailRow
                      label="Percentage / CGPA"
                      value={
                        student.hscPercentage
                          ? `${student.hscPercentage}%`
                          : null
                      }
                      icon={<FaGraduationCap />}
                    />
                    <DetailRow
                      label="Roll Number"
                      value={student.hscRollNumber}
                      icon={<FaBookOpen />}
                      isCopyable
                    />
                  </tbody>
                </table>
              </div>
            </InfoCard>
          )}

          {/* UPLOADED DOCUMENTS */}
          {uploadedDocuments.length > 0 && (
            <InfoCard title="Uploaded Documents" icon={FaFileAlt}>
              <p
                className="document-count"
                aria-label={`${uploadedDocuments.length} documents uploaded`}
              >
                <FaFileAlt className="count-icon" aria-hidden="true" />
                {uploadedDocuments.length} document
                {uploadedDocuments.length !== 1 ? "s" : ""} uploaded
              </p>
              <div className="erp-table-container">
                <table
                  className="erp-detail-table"
                  role="table"
                  aria-label="Uploaded documents"
                >
                  <tbody>
                    {uploadedDocuments.map((doc, index) => (
                      <DocumentRow
                        key={`${doc.label}-${index}`}
                        label={doc.label}
                        path={doc.path}
                        icon={doc.icon}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </InfoCard>
          )}

          {/* ACADEMIC DETAILS */}
          <InfoCard title="Academic Details" icon={FaGraduationCap}>
            <div className="erp-table-container">
              <table
                className="erp-detail-table"
                role="table"
                aria-label="Academic details"
              >
                <tbody>
                  <DetailRow
                    label="College"
                    value={student.college_id?.name}
                    icon={<FaUniversity />}
                  />
                  <DetailRow
                    label="College Code"
                    value={student.college_id?.code}
                    icon={<FaBuilding />}
                    isCopyable
                  />
                  <DetailRow
                    label="Department"
                    value={student.department_id?.name}
                    icon={<FaBuilding />}
                  />
                  <DetailRow
                    label="Course"
                    value={student.course_id?.name}
                    icon={<FaBookOpen />}
                  />
                  <DetailRow
                    label="Admission Year"
                    value={student.admissionYear?.toString()}
                    icon={<FaCalendarAlt />}
                  />
                  <DetailRow
                    label="Current Semester"
                    value={student.currentSemester}
                    icon={<FaGraduationCap />}
                  />
                </tbody>
              </table>
            </div>
          </InfoCard>
        </div>

        {/* RIGHT COLUMN - FEE & SYSTEM INFO */}
        <div className="right-column">
          {/* FEE SUMMARY */}
          <InfoCard
            title="Fee Summary"
            icon={FaRupeeSign}
            className="fee-summary-card"
          >
            <div className="fee-summary-grid">
              <FeeCard
                label="Total Fee"
                value={formatCurrency(feeData?.totalFee)}
                subtitle="Complete program fee"
                variant="total"
              />
              <FeeCard
                label="Paid Amount"
                value={formatCurrency(feeData?.paidAmount)}
                subtitle="Amount received"
                variant="paid"
              />
              <FeeCard
                label="Pending Amount"
                value={formatCurrency(feeData?.pendingAmount)}
                subtitle={
                  feeData?.pendingAmount > 0 ? "Payment due" : "Fully paid"
                }
                variant="pending"
                highlight={feeData?.pendingAmount > 0}
              />
            </div>
          </InfoCard>

          {/* INSTALLMENTS TABLE */}
          <InfoCard title="Payment Installments" icon={FaCreditCard}>
            <span
              className="installment-count"
              aria-label={`${feeData?.installments?.length || 0} installments`}
            >
              {feeData?.installments?.length || 0}{" "}
              {feeData?.installments?.length === 1
                ? "Installment"
                : "Installments"}
            </span>
            <div className="erp-card-body">
              <InstallmentTable installments={feeData?.installments || []} />
            </div>
          </InfoCard>

          {/* SYSTEM INFORMATION */}
          <InfoCard title="System Information" icon={FaShieldAlt}>
            <div className="erp-table-container">
              <table
                className="erp-detail-table"
                role="table"
                aria-label="System information"
              >
                <tbody>
                  <DetailRow
                    label="Status"
                    value={student.status}
                    icon={<FaCheckCircle />}
                  />
                  <DetailRow
                    label="Registered Via"
                    value={student.registeredVia}
                    icon={<FaUserGraduate />}
                  />
                  <DetailRow
                    label="Approved At"
                    value={formatDate(student.approvedAt)}
                    icon={<FaCheckCircle />}
                  />
                  <DetailRow
                    label="Created At"
                    value={formatDate(student.createdAt)}
                    icon={<FaClock />}
                  />
                </tbody>
              </table>
            </div>
          </InfoCard>
        </div>
      </div>

      {/* STYLES */}
      <style>{`
        /* ================= THEME COLORS (Matching Sidebar) ================= */
        :root {
          --erp-primary-dark: #0c2d3a;
          --erp-primary: #0f3a4a;
          --erp-primary-light: #1a4b6d;
          --erp-accent: #3db5e6;
          --erp-accent-light: #4fc3f7;
          --erp-success: #28a745;
          --erp-danger: #dc3545;
          --erp-warning: #ffc107;
          --erp-text: #2c3e50;
          --erp-text-muted: #6c757d;
          --erp-bg: #f5f7fa;
          --erp-card-bg: #ffffff;
          --erp-border: rgba(0, 0, 0, 0.08);
        }

        /* ================= BASE CONTAINER ================= */
        .erp-container {
          padding: 1.5rem;
          background: var(--erp-bg);
          min-height: 100vh;
          animation: fadeIn 0.6s ease;
        }

        /* ================= PRINT STYLES ================= */
        @media print {
          .no-print,
          .erp-header-actions,
          .copy-btn {
            display: none !important;
          }
          
          .erp-container {
            background: white;
            padding: 0;
          }
          
          .erp-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .profile-banner {
            background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        /* ================= PAGE HEADER ================= */
        .erp-page-header {
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(15, 58, 74, 0.3);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          animation: slideDown 0.6s ease;
          border-bottom: 2px solid rgba(61, 181, 230, 0.3);
        }

        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex: 1;
          min-width: 0;
        }

        /* Student Avatar */
        .student-avatar {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: rgba(61, 181, 230, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          border: 3px solid rgba(61, 181, 230, 0.4);
        }

        .erp-header-text {
          flex: 1;
          min-width: 0;
        }

        .erp-page-title {
          margin: 0 0 0.75rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .student-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.15);
          padding: 0.375rem 0.875rem;
          border-radius: 50px;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }

        .meta-icon {
          font-size: 0.875rem;
          color: var(--erp-accent-light);
        }

        .erp-page-subtitle {
          margin: 0.375rem 0 0 0;
          opacity: 0.9;
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.9);
        }

        .erp-header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .erp-header-actions .erp-btn {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .erp-header-actions .erp-btn:hover {
          background: rgba(61, 181, 230, 0.25);
          border-color: var(--erp-accent);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(61, 181, 230, 0.3);
        }

        /* ================= STATUS BADGE ================= */
        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 1rem;
          border-radius: 50px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.25);
        }

        .status-icon {
          font-size: 0.85rem;
        }

        .status-approved {
          color: white;
        }

        .status-pending {
          background: rgba(255, 152, 0, 0.2);
          color: #ff9800;
        }

        .status-rejected {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
        }

        .status-paid {
          background: rgba(76, 175, 80, 0.2);
          color: #4CAF50;
        }

        .status-unpaid {
          background: rgba(255, 152, 0, 0.2);
          color: #ff9800;
        }

        /* ================= MAIN CONTENT GRID ================= */
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

        /* ================= INFO CARD ================= */
        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          animation: fadeIn 0.6s ease;
        }

        .erp-card-header {
          padding: 1.5rem 1.75rem;
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.05) 0%, rgba(12, 45, 58, 0.08) 100%);
          border-bottom: 1px solid rgba(61, 181, 230, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .erp-card-header h3 {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--erp-primary-light);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .erp-card-icon {
          color: var(--erp-accent);
          font-size: 1.25rem;
        }

        .installment-count {
          background: rgba(61, 181, 230, 0.15);
          color: var(--erp-accent);
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

        /* ================= DETAIL TABLE ================= */
        .erp-detail-table {
          width: 100%;
          border-collapse: collapse;
        }

        .erp-detail-table tbody tr {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .erp-detail-table tbody tr:last-child {
          border-bottom: none;
        }

        .erp-detail-table tbody tr:hover {
          background: rgba(61, 181, 230, 0.04);
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
          color: var(--erp-text);
          font-size: 0.95rem;
        }

        .detail-label-icon {
          color: var(--erp-accent);
          font-size: 1.1rem;
          width: 20px;
          display: inline-flex;
          justify-content: center;
        }

        .detail-value {
          color: var(--erp-text);
          font-weight: 600;
          font-size: 1rem;
          word-break: break-word;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          justify-content: space-between;
        }

        .value-content {
          flex: 1;
        }

        .detail-value.email {
          color: #1976d2;
        }

        .detail-value.multiline {
          white-space: pre-line;
          line-height: 1.5;
          display: block;
        }

        /* ================= COPY BUTTON ================= */
        .copy-btn {
          background: rgba(61, 181, 230, 0.15);
          border: none;
          padding: 0.375rem 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          color: var(--erp-accent);
          font-size: 0.875rem;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .copy-btn:hover {
          background: rgba(61, 181, 230, 0.25);
          transform: scale(1.1);
          color: var(--erp-accent-light);
        }

        /* ================= DOCUMENT LINK ================= */
        .document-link {
          color: #1976d2;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .document-link:hover {
          text-decoration: underline;
          color: #1565c0;
        }

        .link-icon {
          font-size: 0.75rem;
        }

        .document-not-uploaded {
          color: var(--erp-text-muted);
          font-style: italic;
          font-size: 0.9rem;
        }

        .document-count {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.75rem;
          color: #6c757d;
          font-size: 0.9rem;
          margin: 0;
        }

        .count-icon {
          color: #1a4b6d;
        }

        /* ================= FEE SUMMARY ================= */
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
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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

        /* ================= INSTALLMENTS TABLE ================= */
        .erp-installments-table {
          width: 100%;
          border-collapse: collapse;
        }

        .erp-installments-table thead {
          background: rgba(15, 58, 74, 0.03);
          border-bottom: 2px solid rgba(61, 181, 230, 0.2);
        }

        .erp-installments-table th {
          padding: 1rem 1.75rem;
          text-align: left;
          font-weight: 700;
          color: var(--erp-primary-light);
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .erp-installments-table tbody tr {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .erp-installments-table tbody tr:last-child {
          border-bottom: none;
        }

        .erp-installments-table tbody tr:hover {
          background: rgba(61, 181, 230, 0.04);
        }

        .erp-installments-table td {
          padding: 1rem 1.75rem;
          color: var(--erp-text);
          font-weight: 500;
        }

        /* ================= EMPTY STATE ================= */
        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--erp-text-muted);
        }

        .empty-icon {
          font-size: 3rem;
          opacity: 0.3;
          margin-bottom: 1rem;
          color: var(--erp-accent);
        }

        .empty-message {
          margin: 0.5rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--erp-text);
        }

        .empty-submessage {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        /* ================= SKELETON LOADING ================= */
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
          background: linear-gradient(90deg, #f0f2f0 25%, #e0e0e0 50%, #f0f2f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .skeleton-text {
          height: 24px;
          background: linear-gradient(90deg, #f0f2f0 25%, #e0e0e0 50%, #f0f2f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          margin-bottom: 0.75rem;
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
          background: linear-gradient(90deg, #f0f2f0 25%, #e0e0e0 50%, #f0f2f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          width: 200px;
          margin-bottom: 1.5rem;
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
          background: linear-gradient(90deg, #f0f2f0 25%, #e0e0e0 50%, #f0f2f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
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
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .skeleton-table-header {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          background: #f8f9fa;
          border-bottom: 2px solid #e9ecef;
        }

        .skeleton-header-cell {
          height: 40px;
          background: linear-gradient(90deg, #f0f2f0 25%, #e0e0e0 50%, #f0f2f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .skeleton-table-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          border-bottom: 1px solid #f0f2f5;
          padding: 1rem 1.75rem;
        }

        .skeleton-cell {
          height: 20px;
          background: linear-gradient(90deg, #f0f2f0 25%, #e0e0e0 50%, #f0f2f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* ================= ERROR CONTAINER ================= */
        .erp-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          text-align: center;
          padding: 2rem;
          background: var(--erp-card-bg);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin: 2rem;
          border: 1px solid var(--erp-border);
        }

        .erp-error-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(220, 53, 69, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: var(--erp-danger);
          font-size: 3rem;
        }

        .erp-error-container h3 {
          font-size: 1.8rem;
          color: var(--erp-primary-light);
          margin-bottom: 1rem;
        }

        .erp-error-container p {
          color: var(--erp-text-muted);
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

        /* ================= LOADING CONTAINER ================= */
        .erp-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 2rem;
          position: relative;
        }

        .loading-skeleton-wrapper {
          width: 100%;
          max-width: 1200px;
          padding: 2rem;
        }

        /* ================= ANIMATIONS ================= */
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

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }

        /* ================= RESPONSIVE DESIGN ================= */
        @media (max-width: 1024px) {
          .main-content-grid {
            grid-template-columns: 1fr;
          }

          .erp-page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.25rem;
          }

          .erp-header-content {
            width: 100%;
          }

          .student-avatar {
            width: 60px;
            height: 60px;
            font-size: 1.5rem;
          }

          .erp-page-title {
            font-size: 1.35rem;
          }

          .student-meta {
            gap: 0.75rem;
          }

          .meta-item {
            font-size: 0.8125rem;
            padding: 0.3125rem 0.75rem;
          }

          .erp-header-actions {
            width: 100%;
            margin-top: 0.5rem;
          }

          .erp-header-actions .erp-btn {
            flex: 1;
            justify-content: center;
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
            padding: 1.25rem;
          }

          .student-avatar {
            width: 50px;
            height: 50px;
            font-size: 1.25rem;
          }

          .erp-page-title {
            font-size: 1.15rem;
          }

          .student-meta {
            gap: 0.5rem;
          }

          .meta-item {
            font-size: 0.75rem;
            padding: 0.25rem 0.625rem;
          }

          .meta-icon {
            font-size: 0.75rem;
          }

          .erp-header-actions {
            width: 100%;
            margin-top: 0.75rem;
          }

          .erp-header-actions .erp-btn {
            width: 100%;
            justify-content: center;
          }

          .detail-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
            padding: 0.875rem 1.25rem;
          }

          .detail-label {
            font-size: 0.9rem;
          }

          .detail-value {
            font-size: 0.95rem;
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
            padding: 0.5rem;
          }

          .erp-installments-table td {
            display: block;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #f0f2f5;
          }

          .erp-installments-table td:last-child {
            border-bottom: none;
          }

          .erp-installments-table td::before {
            content: attr(data-label);
            font-weight: 600;
            color: #1a4b6d;
            display: block;
            margin-bottom: 0.25rem;
          }

          .fee-value {
            font-size: 1.5rem;
          }

          .profile-banner-name {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
