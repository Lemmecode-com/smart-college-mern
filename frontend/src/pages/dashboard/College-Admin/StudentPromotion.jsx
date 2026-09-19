import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthContext } from "../../../auth/AuthContext";
import Breadcrumb from "../../../components/Breadcrumb";
import {
  getPromotionEligibleStudents,
  promoteStudent,
  bulkPromoteStudents,
  getCollegePromotionHistory,
  getPromotionEligibility,
  getStudentBacklogs,
  getBacklogAttempts,
  createBacklogAttempt,
  recommendPromotionDecision,
  approvePromotionDecision,
  rejectPromotionDecision,
  executePromotionDecision,
} from "../../../api/promotion";
import { moveToAlumni } from "../../../api/alumni";
import Loading from "../../../components/Loading";
import Pagination from "../../../components/Pagination";
import ConfirmModal from "../../../components/ConfirmModal";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

import {
  FaGraduationCap,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSearch,
  FaArrowUp,
  FaTimes,
  FaRupeeSign,
  FaSyncAlt,
  FaSpinner,
  FaHistory,
  FaDollarSign,
  FaUsers,
  FaFilter,
  FaSortAmountDown,
  FaSortAmountUp,
  FaClipboardCheck,
  FaEye,
  FaFileAlt,
  FaInfoCircle,
  FaExclamationCircle,
} from "react-icons/fa";

const PAGE_SIZE = 10;

/**
 * Helper function to get ordinal suffix (st, nd, rd, th)
 */
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

const ATTENDANCE_STATUS = {
  ELIGIBLE: "ELIGIBLE",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  ATTENDANCE_NOT_AVAILABLE: "ATTENDANCE_NOT_AVAILABLE",
};

function formatStatus(status) {
  return status ? status.replace(/_/g, " ") : "-";
}

function getAttendanceStatusBadge(status) {
  switch (status) {
    case ATTENDANCE_STATUS.ELIGIBLE:
      return "badge badge-success";
    case ATTENDANCE_STATUS.NOT_ELIGIBLE:
      return "badge badge-danger";
    case ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE:
      return "badge badge-warning";
    default:
      return "badge badge-secondary";
  }
}

/**
 * Backlog status badge styling (Step 5 - read-only backlog management)
 */
function getBacklogStatusBadge(status) {
  switch (status) {
    case "OPEN":
      return "badge badge-warning";
    case "ATTEMPTED":
      return "badge badge-info";
    case "CLEARED":
      return "badge badge-success";
    case "CANCELLED":
      return "badge badge-secondary";
    default:
      return "badge badge-secondary";
  }
}

/**
 * Backlog attempt status badge styling (Step 6 - attempt history / creation UI).
 * Statuses are backend-controlled; unknown statuses fall back safely.
 */
function getAttemptStatusBadge(status) {
  switch (status) {
    case "INCOMPLETE":
      return "badge badge-warning";
    case "PASS":
      return "badge badge-success";
    case "FAIL":
      return "badge badge-danger";
    case "EVALUATED":
      return "badge badge-info";
    default:
      return "badge badge-secondary";
  }
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function isStudentPromotable(student) {
  if (!student) return false;
  const feeOk = student.allInstallmentsPaid;
  const attendanceOk = student.attendanceStatus === ATTENDANCE_STATUS.ELIGIBLE;
  return feeOk && attendanceOk;
}

/**
 * Format promotion decision reason for display
 */
function formatDecisionReason(reason) {
  if (!reason) return "-";
  const reasonMap = {
    FEE_NOT_CLEARED: "Fee Not Cleared",
    ATTENDANCE_INSUFFICIENT: "Attendance Insufficient",
    ATTENDANCE_NOT_AVAILABLE: "Attendance Not Available",
    KT_LIMIT_EXCEEDED: "KT Limit Exceeded",
    RESULT_INCOMPLETE: "Result Incomplete",
    ELIGIBLE: "Eligible",
  };
  return reasonMap[reason] || reason.replace(/_/g, " ");
}

/**
 * Format promotion outcome for display
 */
function formatOutcome(outcome) {
  if (!outcome) return "Unknown";
  const outcomeMap = {
    PASS: "Pass",
    ATKT: "ATKT (Allowed to Keep Term)",
    FAIL: "Fail",
    INCOMPLETE: "Incomplete",
    NO_RESULT: "No Result",
    AMBIGUOUS_RESULT: "Ambiguous Result",
    BLOCKED: "Blocked",
  };
  return outcomeMap[outcome] || outcome;
}

/**
 * Get icon for promotion outcome
 */
function getOutcomeIcon(outcome) {
  const iconMap = {
    PASS: "✅",
    ATKT: "⚠️",
    FAIL: "❌",
    INCOMPLETE: "⏳",
    NO_RESULT: "❓",
    AMBIGUOUS_RESULT: "⚡",
    BLOCKED: "🚫",
  };
  return iconMap[outcome] || "📋";
}

/**
 * Get user-friendly display label for promotion outcome
 * This is the primary status shown to users - clearer than "Outcome: X"
 * Considers workflow_status to avoid misleading "Promoted" before execution
 */
function getOutcomeDisplayLabel(outcome, workflowStatus) {
  if (!outcome) return "Status Unknown";
  
  // If outcome is PASS but workflow hasn't executed yet, show eligibility status
  if (outcome === "PASS") {
    const executedStatuses = ["PROMOTED", "EXECUTED"];
    const isExecuted = workflowStatus && executedStatuses.includes(workflowStatus);
    
    if (isExecuted) {
      return "Promoted Successfully";
    }
    
    // Not yet executed - show based on workflow stage
    if (workflowStatus === "APPROVED") return "Approved - Ready to Promote";
    if (workflowStatus === "RECOMMENDED" || workflowStatus === "UNDER_REVIEW") return "Recommended for Promotion";
    if (workflowStatus === "DRAFT") return "Eligible for Promotion";
    return "Eligible for Promotion"; // fallback
  }
  
  const labelMap = {
    ATKT: "Allowed to Keep Term (ATKT)",
    FAIL: "Promotion Failed",
    INCOMPLETE: "Result Incomplete",
    NO_RESULT: "No Result Available",
    AMBIGUOUS_RESULT: "Ambiguous Result",
    BLOCKED: "Promotion Blocked",
  };
  return labelMap[outcome] || outcome;
}

/**
 * Get banner style for promotion outcome
 */
function getOutcomeBannerStyle(outcome) {
  const styleMap = {
    PASS: { background: "linear-gradient(135deg, #059669 0%, #047857 100%)", color: "white" },
    ATKT: { background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white" },
    FAIL: { background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "white" },
    INCOMPLETE: { background: "linear-gradient(135deg, #3db5e6 0%, #1c7ed6 100%)", color: "white" },
    NO_RESULT: { background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)", color: "white" },
    AMBIGUOUS_RESULT: { background: "linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)", color: "white" },
    BLOCKED: { background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)", color: "white" },
  };
  return {
    padding: "16px 20px",
    borderRadius: "12px",
    marginBottom: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    ...styleMap[outcome],
  };
}

/**
 * Format workflow status for display
 */
function formatWorkflowStatus(status) {
  if (!status) return "Unknown";
  const statusMap = {
    DRAFT: "Draft",
    RECOMMENDED: "Recommended",
    UNDER_REVIEW: "Under Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PROMOTED: "Promoted",
    BLOCKED: "Blocked",
    REVERSED: "Reversed",
  };
  return statusMap[status] || status;
}

/**
 * Format a snapshot value for human-readable display.
 * - Booleans render as Yes/No (React JSX omits raw true/false).
 * - null/undefined render as a muted dash.
 * - Objects/arrays render as JSON.
 * - Strings and numbers render as-is.
 */
function formatSnapshotValue(value) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value === null || value === undefined) {
    return <span className="text-muted">-</span>;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return value;
}

/**
 * Render snapshot object as key-value pairs
 */
function renderSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return <span className="text-muted">No data available</span>;
  }

  const entries = Object.entries(snapshot);
  if (entries.length === 0) {
    return <span className="text-muted">No data available</span>;
  }

  return (
    <div className="snapshot-content">
      {entries.map(([key, value]) => (
        <div key={key} className="detail-row" style={{ marginBottom: "8px" }}>
          <span className="detail-label" style={{ fontWeight: "600", color: "#64748b", fontSize: "13px" }}>
            {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}:
          </span>
          <span className="detail-value" style={{ color: "#0f3a4a", fontSize: "13px" }}>
            {formatSnapshotValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function StudentPromotion({ admissionOfficerMode = false }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

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

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [promotionRemarks, setPromotionRemarks] = useState("");
  const [overrideFeeCheck, setOverrideFeeCheck] = useState(false);
  const [overrideAttendanceCheck, setOverrideAttendanceCheck] = useState(false);
  const [overrideAttendanceReason, setOverrideAttendanceReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [promotedByName, setPromotedByName] = useState(user?.name || "Admin");
  const [showAlumniModal, setShowAlumniModal] = useState(false);
  const [alumniStudent, setAlumniStudent] = useState(null);
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear());
  const [promotionThreshold, setPromotionThreshold] = useState(75);

  // Eligibility Check State
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [eligibilityStudent, setEligibilityStudent] = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [eligibilityError, setEligibilityError] = useState(null);

  // Backlog Management State (read-only, Step 5)
  const [backlogs, setBacklogs] = useState([]);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [backlogError, setBacklogError] = useState(null);
  const [backlogStatusFilter, setBacklogStatusFilter] = useState("ALL");

  // Backlog Attempts State (Step 6 - attempt history / creation UI)
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const [selectedBacklog, setSelectedBacklog] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState(null);
  const [attemptActionLoading, setAttemptActionLoading] = useState(false);
  const [attemptCreateError, setAttemptCreateError] = useState(null);

  // Workflow action state
  const [actionLoading, setActionLoading] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [recommendComment, setRecommendComment] = useState("");
  const [approveComment, setApproveComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");

  // Bulk Result Modal State
  const [showBulkResultModal, setShowBulkResultModal] = useState(false);
  const [bulkResultData, setBulkResultData] = useState(null);
  const [bulkSuccessCount, setBulkSuccessCount] = useState(0);

  // Confirm Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    type: "warning",
    onConfirm: () => {},
  });

  // Helper to show confirm modal
  const showConfirm = (title, message, type, onConfirm) => {
    setConfirmConfig({ title, message, type, onConfirm });
    setShowConfirmModal(true);
  };

  if (!user) return <Navigate to="/login" />;
  if (!admissionOfficerMode && user.role !== "COLLEGE_ADMIN") {
    return <Navigate to="/dashboard" />;
  }
  // When admissionOfficerMode is true, we allow ADMISSION_OFFICER (ProtectedRoute already validated)

  // 🎓 HELPER: Calculate next academic year string (e.g., "2024-2025" → "2025-2026")
  const getNextAcademicYear = (currentYear) => {
    if (!currentYear) return "";
    const [startYear] = currentYear.split("-");
    const nextStart = parseInt(startYear) + 1;
    return `${nextStart}-${nextStart + 1}`;
  };

  const fetchEligibleStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getPromotionEligibleStudents();

      setStudents(res.students || []);
      if (res.promotionThreshold) {
        setPromotionThreshold(res.promotionThreshold);
      }
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load students for promotion.";

      logger.error("Error fetching promotion eligible students:", statusCode, errorCode);

      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });

      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPromotionHistory = async () => {
    try {
      const res = await getCollegePromotionHistory({ limit: 50 });
      setPromotionHistory(res.promotions || []);
    } catch (err) {
      // Silently fail - history is optional
    }
  };

  const checkEligibility = async (student) => {
    try {
      setEligibilityLoading(true);
      setEligibilityError(null);
      setEligibilityData(null);
      setEligibilityStudent(student);
      setShowEligibilityModal(true);

      const res = await getPromotionEligibility(student._id);
      setEligibilityData(res.data || res);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to check eligibility.";

      logger.error("Error checking promotion eligibility:", statusCode, errorCode);
      setEligibilityError({
        message: errorMessage,
        statusCode,
        errorCode,
      });

      if (statusCode !== 401 && (!errorCode || !AUTH_ERROR_CODES.has(errorCode))) {
        toast.error(errorMessage);
      }
    } finally {
      setEligibilityLoading(false);
    }
  };

  const refreshEligibility = async () => {
    if (!eligibilityStudent) return;
    try {
      const res = await getPromotionEligibility(eligibilityStudent._id);
      setEligibilityData(res.data || res);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to refresh decision state.";

      logger.error("Error refreshing promotion eligibility:", statusCode, errorCode);
      setEligibilityError({
        message: errorMessage,
        statusCode,
        errorCode,
      });

      if (statusCode !== 401 && (!errorCode || !AUTH_ERROR_CODES.has(errorCode))) {
        toast.error(errorMessage);
      }
    }
  };

  /**
   * Fetch student backlogs (Step 5 - read-only backlog management).
   * Lazy-loaded when the eligibility modal is opened for a student.
   */
  const fetchBacklogs = async (studentId, status = backlogStatusFilter) => {
    if (!studentId) return;
    setBacklogLoading(true);
    setBacklogError(null);
    try {
      const res = await getStudentBacklogs(studentId, status === "ALL" ? undefined : status);
      const payload = res?.data || res;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.backlogs)
          ? payload.backlogs
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
      setBacklogs(list);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load backlog records.";

      logger.error("Error fetching student backlogs:", statusCode, errorCode);
      setBacklogError({ message: errorMessage, statusCode, errorCode });

      if (statusCode !== 401 && (!errorCode || !AUTH_ERROR_CODES.has(errorCode))) {
        toast.error(errorMessage);
      }
    } finally {
      setBacklogLoading(false);
    }
  };

  /**
   * Fetch attempts for a single backlog (Step 6 - attempt history / creation UI).
   * Lazy-loaded only when the user opens the attempts modal for a backlog.
   */
  const fetchAttempts = async (backlogId) => {
    if (!backlogId) return;
    setAttemptsLoading(true);
    setAttemptsError(null);
    setAttempts([]);
    try {
      const res = await getBacklogAttempts(backlogId);
      const payload = res?.data || res;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.attempts)
          ? payload.attempts
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
      setAttempts(list);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load backlog attempts.";

      logger.error("Error fetching backlog attempts:", statusCode, errorCode);
      setAttemptsError({ message: errorMessage, statusCode, errorCode });

      if (statusCode !== 401 && (!errorCode || !AUTH_ERROR_CODES.has(errorCode))) {
        toast.error(errorMessage);
      }
    } finally {
      setAttemptsLoading(false);
    }
  };

  /**
   * Open the attempts modal for a backlog and lazy-load its attempts.
   */
  const openAttemptsModal = (backlog) => {
    if (!backlog?._id) return;
    setSelectedBacklog(backlog);
    setAttempts([]);
    setAttemptsError(null);
    setAttemptCreateError(null);
    setShowAttemptsModal(true);
    fetchAttempts(backlog._id);
  };

  const closeAttemptsModal = () => {
    setShowAttemptsModal(false);
    setSelectedBacklog(null);
    setAttempts([]);
    setAttemptsError(null);
    setAttemptCreateError(null);
  };

  /**
   * Create a backlog attempt (Step 6).
   *
   * The backend `createAttempt` service requires NO request body: it auto-creates
   * a supplementary exam and the first attempt row. Backend remains authoritative
   * for attempt limits, status transitions, and exam creation.
   *
   * Response mapping: the axios interceptor flattens the standardized
   * `{ success, message, data: {...} }` envelope so the attempt/exam payload
   * arrives at the top level. The `payload` extraction below handles both the
   * flattened shape and a legacy nested `{ data: {...} }` shape.
   */
  const handleCreateAttempt = async () => {
    const backlogId = selectedBacklog?._id;
    if (!backlogId) {
      toast.error("Backlog not available.");
      return;
    }
    setAttemptActionLoading(true);
    setAttemptCreateError(null);
    try {
      const res = await createBacklogAttempt(backlogId, {});
      const payload = res?.data || res;
      const attempt = payload?.data?.attempt || payload?.attempt || null;
      const exam = payload?.data?.exam || payload?.exam || null;

      toast.success("Backlog attempt created successfully.");
      await fetchAttempts(backlogId);
      if (eligibilityStudent?._id) {
        await fetchBacklogs(eligibilityStudent._id, backlogStatusFilter);
      }
      if (attempt?._id) {
        toast.info(`Exam: ${exam?.name || "Supplementary exam created"}`, {
          autoClose: 6000,
        });
      }
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to create backlog attempt.";

      logger.error("Error creating backlog attempt:", statusCode, errorCode);
      setAttemptCreateError({ message: errorMessage, statusCode, errorCode });

      if (statusCode !== 401 && (!errorCode || !AUTH_ERROR_CODES.has(errorCode))) {
        toast.error(errorMessage);
      }
    } finally {
      setAttemptActionLoading(false);
    }
  };

  const openCreateAttemptConfirm = () => {
    if (!selectedBacklog) return;
    showConfirm(
      "Create Backlog Attempt",
      `Are you sure you want to create a new attempt for "${selectedBacklog.subject_name || selectedBacklog.subject_code || "this subject"}"?\n\n` +
        `A supplementary exam will be created automatically by the backend.\n` +
        `This action cannot be undone.`,
      "warning",
      handleCreateAttempt,
    );
  };

  const handleRecommend = async () => {
    const decisionId = eligibilityData?._id;
    if (!decisionId) {
      toast.error("Promotion decision not available.");
      return;
    }
    setActionLoading(true);
    try {
      await recommendPromotionDecision(decisionId, recommendComment.trim());
      toast.success("Promotion recommendation submitted successfully.");
      setShowRecommendModal(false);
      setRecommendComment("");
      await refreshEligibility();
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to submit recommendation.";

      logger.error("Error recommending promotion:", statusCode, errorCode);
      if (statusCode !== 401 && (!errorCode || !AUTH_ERROR_CODES.has(errorCode))) {
        toast.error(errorMessage);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    const decisionId = eligibilityData?._id;
    if (!decisionId) {
      toast.error("Promotion decision not available.");
      return;
    }
    setActionLoading(true);
    try {
      await approvePromotionDecision(decisionId, approveComment.trim());
      toast.success("Promotion decision approved successfully.");
      setShowApproveModal(false);
      setApproveComment("");
      await refreshEligibility();
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to approve promotion decision.";

      logger.error("Error approving promotion:", statusCode, errorCode);
      if (statusCode !== 401 && (!errorCode || !AUTH_ERROR_CODES.has(errorCode))) {
        toast.error(errorMessage);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const decisionId = eligibilityData?._id;
    if (!decisionId) {
      toast.error("Promotion decision not available.");
      return;
    }
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setRejectReasonError("A rejection reason is required.");
      return;
    }
    setActionLoading(true);
    try {
      await rejectPromotionDecision(decisionId, trimmedReason);
      toast.success("Promotion decision rejected successfully.");
      setShowRejectModal(false);
      setRejectReason("");
      setRejectReasonError("");
      await refreshEligibility();
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to reject promotion decision.";

      logger.error("Error rejecting promotion:", statusCode, errorCode);
      if (statusCode !== 401 && (!errorCode || !AUTH_ERROR_CODES.has(errorCode))) {
        toast.error(errorMessage);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openRecommendModal = () => {
    setRecommendComment("");
    setShowRecommendModal(true);
  };

  const openApproveModal = () => {
    setApproveComment("");
    setShowApproveModal(true);
  };

  const openRejectModal = () => {
    setRejectReason("");
    setRejectReasonError("");
    setShowRejectModal(true);
  };

  const isReviewableOutcome = (outcome) =>
    outcome === "PASS" || outcome === "ATKT";

  const canShowWorkflowActions = () => {
    if (!eligibilityData) return false;
    if (!isReviewableOutcome(eligibilityData.promotion_outcome)) return false;
    return true;
  };

  const workflowStatus = eligibilityData?.workflow_status;
  const showRecommend = canShowWorkflowActions() && workflowStatus === "DRAFT";
  const showApprove = canShowWorkflowActions() &&
    (workflowStatus === "RECOMMENDED" || workflowStatus === "UNDER_REVIEW");
  const showReject = canShowWorkflowActions() &&
    (workflowStatus === "RECOMMENDED" || workflowStatus === "UNDER_REVIEW");
  const showExecute = canShowWorkflowActions() && workflowStatus === "APPROVED";

  const openExecuteModal = () => {
    setShowExecuteModal(true);
  };

  const handleExecute = async () => {
    const decisionId = eligibilityData?._id;
    if (!decisionId) {
      toast.error("Promotion decision not available.");
      return;
    }
    setActionLoading(true);
    try {
      const response = await executePromotionDecision(decisionId);
      const responseStatus =
        response?.decision?.workflow_status ||
        response?.executionStatus ||
        eligibilityData?.workflow_status;
      toast.success("Promotion executed successfully.");
      setShowExecuteModal(false);
      await refreshEligibility();
      if (responseStatus === "PROMOTED" && eligibilityStudent) {
        fetchEligibleStudents();
        if (showHistory) {
          await fetchPromotionHistory();
        }
      }
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to execute promotion decision.";

      logger.error("Error executing promotion:", statusCode, errorCode);
      if (statusCode !== 401 && (!errorCode || !AUTH_ERROR_CODES.has(errorCode))) {
        toast.error(errorMessage);
      }
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibleStudents();
  }, []);

  /**
   * Lazy-load backlog records when the eligibility modal is opened for a student.
   * Backlogs are fetched once per modal open to avoid duplicate requests.
   */
  useEffect(() => {
    if (showEligibilityModal && eligibilityStudent?._id) {
      setBacklogs([]);
      setBacklogError(null);
      setBacklogStatusFilter("ALL");
      fetchBacklogs(eligibilityStudent._id, "ALL");
    } else {
      setBacklogs([]);
      setBacklogError(null);
    }
  }, [showEligibilityModal, eligibilityStudent?._id]);

  /**
   * Refetch backlogs when the status filter changes for the currently selected student.
   */
  useEffect(() => {
    if (!showEligibilityModal || !eligibilityStudent?._id) return;
    fetchBacklogs(eligibilityStudent._id, backlogStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backlogStatusFilter]);

  const handleRetry = () => {
    fetchEligibleStudents();
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        `${student.fullName} ${student.email} ${student.course_id?.name || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesSemester =
        semesterFilter === "ALL" ||
        student.currentSemester.toString() === semesterFilter;
      return matchesSearch && matchesSemester;
    });
  }, [students, search, semesterFilter]);

  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const paginatedStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, semesterFilter]);

  const handleSelectStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(paginatedStudents.map((s) => s._id));
    } else {
      setSelectedStudents([]);
    }
  };

  const openPromoteModal = (student) => {
    setSelectedStudent(student);
    setPromotionRemarks("");
    setOverrideFeeCheck(false);
    setOverrideAttendanceCheck(false);
    setOverrideAttendanceReason("");
    setShowPromoteModal(true);
  };

  const handlePromoteStudent = async () => {
    try {
      setLoading(true);

      if (
        selectedStudent.attendanceStatus === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE &&
        overrideAttendanceCheck &&
        overrideAttendanceReason.trim().length < 10
      ) {
        toast.error("Attendance override reason must be at least 10 characters.", {
          position: "top-right",
          autoClose: 5000,
        });
        return;
      }

      const response = await promoteStudent(selectedStudent._id, {
        remarks: promotionRemarks,
        overrideFeeCheck,
        overrideAttendanceCheck,
        overrideAttendanceReason: overrideAttendanceCheck ? overrideAttendanceReason.trim() : "",
      });

      // ✅ Updated success message with year-wise info from API
      setSuccessMessage(
        `${selectedStudent.fullName} promoted successfully from ${selectedStudent.academicYearLabel} (Sem ${selectedStudent.currentSemester}) to Sem ${selectedStudent.currentSemester + 1}`,
      );
      setShowPromoteModal(false);
      fetchEligibleStudents();
      setTimeout(() => setSuccessMessage(""), 5000);
      toast.success("Student promoted successfully!", {
        position: "top-right",
        autoClose: 4000,
      });
      // Warn admin if fee structure was not found for new semester
      if (response?.promotion?.feeAssignmentWarning) {
        toast.warn(response.promotion.feeAssignmentWarning, {
          position: "top-right",
          autoClose: 8000,
        });
      }
    } catch (err) {
      // Show specific error message
      const errorMessage = err.response?.data?.message || err.message || "Failed to promote student.";
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToAlumni = async () => {
    try {
      setLoading(true);

      const response = await moveToAlumni(alumniStudent._id, {
        graduationYear,
      });

      setSuccessMessage(`${alumniStudent.fullName} has been moved to Alumni successfully`);
      setShowAlumniModal(false);
      fetchEligibleStudents();
      setTimeout(() => setSuccessMessage(""), 5000);
      toast.success("Student moved to Alumni successfully!", {
        position: "top-right",
        autoClose: 4000,
      });
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to move to Alumni.";
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const openAlumniModal = (student) => {
    setAlumniStudent(student);
    setGraduationYear(new Date().getFullYear());
    setShowAlumniModal(true);
  };

  const handleBulkPromote = async () => {
    try {
      // Check if any selected students are ineligible before proceeding
      const ineligibleStudents = selectedStudents.filter((id) => {
        const student = students.find((s) => s._id === id);
        if (!student) return false;
        // Check fee eligibility
        const feeIneligible = !student.allInstallmentsPaid && !overrideFeeCheck;
        // Check attendance eligibility
        const attendanceIneligible = 
          student.attendanceStatus === ATTENDANCE_STATUS.NOT_ELIGIBLE ||
          (student.attendanceStatus === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE && !overrideAttendanceCheck);
        return feeIneligible || attendanceIneligible;
      });

      if (ineligibleStudents.length > 0) {
        const ineligibleCount = ineligibleStudents.length;
        const totalSelected = selectedStudents.length;
        
        toast.error(
          `${ineligibleCount} of ${totalSelected} selected student(s) are not eligible for promotion. ` +
          `Please deselect students with pending fees or insufficient attendance, or use override options.`,
          {
            position: "top-right",
            autoClose: 8000,
          }
        );
        return;
      }

      setLoading(true);
      if (
        overrideAttendanceCheck &&
        overrideAttendanceReason.trim().length < 10
      ) {
        toast.error("Attendance override reason must be at least 10 characters.", {
          position: "top-right",
          autoClose: 5000,
        });
        return;
      }

      const res = await bulkPromoteStudents({
        studentIds: selectedStudents,
        overrideFeeCheck,
        overrideAttendanceCheck,
        overrideAttendanceReason: overrideAttendanceCheck ? overrideAttendanceReason.trim() : "",
      });
      const successCount = res.results.success.length;
      const failCount = res.results.failed ? res.results.failed.length : 0;
      setSelectedStudents([]);
      fetchEligibleStudents();
      if (successCount > 0) {
        setSuccessMessage(
          `${successCount} student${successCount > 1 ? "s" : ""} promoted successfully${failCount > 0 ? `, ${failCount} failed` : ""}!`,
        );
        setTimeout(() => setSuccessMessage(""), 5000);
        toast.success(`${successCount} student${successCount > 1 ? "s" : ""} promoted successfully!`, {
          position: "top-right",
          autoClose: 4000,
        });
      }
      if (failCount > 0) {
        setBulkSuccessCount(successCount);
        setBulkResultData(res.results.failed);
        setShowBulkResultModal(true);
        const summaryMessage = `${failCount} student${failCount > 1 ? "s" : ""} could not be promoted.`;
        toast.warn(summaryMessage + "see the reasons.", {
          position: "top-right",
          autoClose: 6000,
        });
        setError(summaryMessage);
      }
      // Warn if any promoted students had missing fee structures
      const feeWarnings = res.results.success.filter(s => s.feeAssignmentWarning);
      if (feeWarnings.length > 0) {
        toast.warn(`${feeWarnings.length} student(s) promoted but fee structure not found for new semester. Please assign fees manually.`, {
          position: "top-right",
          autoClose: 8000,
        });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to promote students.";
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const viewHistory = async () => {
    await fetchPromotionHistory();
    setShowHistory(true);
  };

  const fullyPaidCount = students.filter(
    (s) => s.feeStatus === "FULLY_PAID",
  ).length;
  const pendingCount = students.filter(
    (s) => s.feeStatus !== "FULLY_PAID",
  ).length;
  const selectedAttendanceNotAvailableCount = selectedStudents.filter((id) =>
    students.find((student) => student._id === id)?.attendanceStatus === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE
  ).length;

  const getFeeStatusBadge = (status) => {
    switch (status) {
      case "FULLY_PAID":
        return "badge badge-success";
      case "PARTIALLY_PAID":
        return "badge badge-warning";
      default:
        return "badge badge-danger";
    }
  };

  if (error && !loading && students.length === 0) {
    return (
      <ApiError
        title="Student Promotion Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={handleRetry}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  return (
    <div className="page-container">
       {/* Breadcrumb */}
       <Breadcrumb
         items={admissionOfficerMode
           ? [
               { label: "Dashboard", path: "/dashboard/admission" },
               { label: "Student Promotion" },
             ]
           : [
               { label: "Dashboard", path: "/dashboard" },
               { label: "Student Promotion" },
             ]
         }
       />

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <FaGraduationCap className="header-icon" />
            Student Promotion
          </h1>
          <p className="page-subtitle">
            Promote students to next academic year based on fee payment status
          </p>
        </div>
        <div className="header-actions">
          <button onClick={viewHistory} className="btn btn-outline-secondary">
            <FaHistory /> View History
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success">
          <FaCheckCircle /> {successMessage}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FaUsers />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Students</div>
            <div className="stat-value">{students.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaDollarSign />
          </div>
          <div className="stat-content">
            <div className="stat-label">Fees Paid</div>
            <div className="stat-value">{fullyPaidCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaExclamationTriangle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Fees Pending</div>
            <div className="stat-value">{pendingCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Selected</div>
            <div className="stat-value">{selectedStudents.length}</div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedStudents.length > 0 && (
        <div className="bulk-action-bar">
          <span className="bulk-action-text">
            {selectedStudents.length} student(s) selected for promotion
          </span>
          <button
            onClick={handleBulkPromote}
            disabled={loading}
            className="btn btn-primary"
          >
            <FaArrowUp /> {loading ? "Processing..." : "Promote All Selected"}
          </button>
          {!admissionOfficerMode && (
            <label className="custom-checkbox-label">
              <input
                type="checkbox"
                checked={overrideFeeCheck}
                onChange={(e) => setOverrideFeeCheck(e.target.checked)}
                className="custom-checkbox"
              />
              <span>Override fee check</span>
            </label>
          )}
          {selectedAttendanceNotAvailableCount > 0 && (
            <div className="bulk-action-overrides">
              <label className="custom-checkbox-label">
                <input
                  type="checkbox"
                  checked={overrideAttendanceCheck}
                  onChange={(e) => setOverrideAttendanceCheck(e.target.checked)}
                  className="custom-checkbox"
                />
                <span>Override attendance check for {selectedAttendanceNotAvailableCount} student(s) with no attendance records</span>
              </label>
              {overrideAttendanceCheck && (
                <input
                  type="text"
                  value={overrideAttendanceReason}
                  onChange={(e) => setOverrideAttendanceReason(e.target.value)}
                  className="form-control"
                  placeholder="Attendance override reason (minimum 10 characters)"
                  minLength={10}
                  required
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="clear-search-btn"
              title="Clear search"
            >
              <FaTimes />
            </button>
          )}
        </div>
        <div className="filter-group">
          <select
            value={semesterFilter}
            onChange={(e) => {
              setSemesterFilter(e.target.value);
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
          {(search || semesterFilter !== "ALL") && (
            <button onClick={() => { setSearch(""); setSemesterFilter("ALL"); }} className="btn btn-outline-secondary btn-sm">
              <FaTimes /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* History View */}
      {showHistory ? (
        <>
          {/* History Page Header */}
          <div className="erp-page-header">
            <div className="erp-header-content">
              <div className="erp-header-icon">
                <FaHistory />
              </div>
              <div className="erp-header-text">
                <h1 className="erp-page-title">Promotion History</h1>
                <p className="erp-page-subtitle">
                  View all student promotion records across the college
                </p>
              </div>
            </div>
            <div className="header-actions">
              <button
                onClick={() => setShowHistory(false)}
                className="history-back-btn"
              >
                ← Back to Students
              </button>
            </div>
          </div>

          {/* History Stats */}
          <div className="stats-grid animate-fade-in">
            <div className="stat-card">
              <div
                className="stat-card-icon"
                style={{
                  background: "linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%)",
                }}
              >
                <FaHistory />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-label">Total Promotions</div>
                <div className="stat-card-value">
                  {promotionHistory.length}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div
                className="stat-card-icon"
                style={{
                  background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
                }}
              >
                <FaGraduationCap />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-label">Final Year Promotions</div>
                <div className="stat-card-value">
                  {promotionHistory.filter((r) => r.isFinalSemesterPromotion).length}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div
                className="stat-card-icon"
                style={{
                  background: "linear-gradient(135deg, #4CAF50 0%, #43A047 100%)",
                }}
              >
                <FaCheckCircle />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-label">Fully Paid</div>
                <div className="stat-card-value">
                  {promotionHistory.filter((r) => r.feeStatus === "FULLY_PAID").length}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div
                className="stat-card-icon"
                style={{
                  background: "linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",
                }}
              >
                <FaUsers />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-label">Unique Students</div>
                <div className="stat-card-value">
                  {new Set(promotionHistory.map((r) => r.student_id?._id)).size}
                </div>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="erp-card animate-fade-in">
            <div className="erp-card-header">
              <h3>
                <FaHistory className="erp-card-icon" />
                Promotion History Records
              </h3>
              <span className="record-count">
                {promotionHistory.length}{" "}
                {promotionHistory.length === 1 ? "Record" : "Records"}
              </span>
            </div>
            <div className="erp-card-body">
              <div className="table-container">
                {promotionHistory && promotionHistory.length > 0 ? (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Promotion</th>
                          <th>Fee Status</th>
                          <th>Attendance</th>
                          <th>Override</th>
                          <th>Date</th>
                          <th>Promoted By</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {promotionHistory.map((record) => (
                          <tr key={record._id}>
                            <td>
                              <div className="student-name">
                                {record.student_id?.fullName}
                              </div>
                              <div className="student-email">
                                {record.student_id?.email}
                              </div>
                            </td>
                            <td>
                              <div>
                                <span className="text-muted">
                                  {record.fromAcademicYear ||
                                    `Sem ${record.fromSemester}`}
                                </span>
                                <span className="mx-2">→</span>
                                <span className="text-primary fw-bold">
                                  {record.toAcademicYear ||
                                    `Sem ${record.toSemester}`}
                                </span>
                              </div>
                              <div
                                className="text-muted"
                                style={{ fontSize: "11px" }}
                              >
                                Sem {record.fromSemester} → Sem {record.toSemester}
                              </div>
                              {record.isFinalSemesterPromotion && (
                                <span className="badge badge-warning mt-1" style={{ fontSize: "10px" }}>
                                  <FaGraduationCap className="mr-1" /> Final Year
                                </span>
                              )}
                            </td>
                            <td>
                              <span
                                className={`badge ${getFeeStatusBadge(record.feeStatus)}`}
                              >
                                {record.feeStatus.replace("_", " ")}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${getAttendanceStatusBadge(record.attendanceStatus)}`}
                              >
                                {formatStatus(record.attendanceStatus)}
                              </span>
                              <div className="text-muted" style={{ fontSize: "11px" }}>
                                {record.attendancePercentage ?? 0}%
                              </div>
                              {record.attendanceCheckedAt && (
                                <div className="text-muted" style={{ fontSize: "11px" }}>
                                  {new Date(record.attendanceCheckedAt).toLocaleString()}
                                </div>
                              )}
                            </td>
                            <td className="text-muted">
                              {record.attendanceOverridden
                                ? record.attendanceOverrideReason || "Attendance override recorded"
                                : "-"}
                            </td>
                            <td className="text-muted">
                              {new Date(record.promotionDate).toLocaleDateString()}
                            </td>
                            <td className="text-muted">
                              {record.promotedByName || "-"}
                            </td>
                            <td className="text-muted">{record.remarks || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <FaHistory className="empty-icon" />
                    <p className="empty-title">No Promotion History</p>
                    <p className="empty-text">
                      No promotion records have been created yet. Promote students to start building history.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Students Table */
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Eligible Students</h3>
            <div className="card-header-actions">
              <span className="text-muted">
                {filteredStudents.length} of {students.length} students
              </span>
              <span className="badge badge-info ml-2">
                Attendance threshold: {promotionThreshold}%
              </span>
            </div>
          </div>
          <div className="card-body">
            {loading && students.length === 0 ? (
              <div className="loading-container">
                <FaSpinner className="spinner-icon" />
                <p>Loading students...</p>
              </div>
            ) : !loading && students.length === 0 ? (
              <div className="empty-state">
                <FaGraduationCap className="empty-icon" />
                <p className="empty-title">No Students Found</p>
                <p className="empty-text">
                  No students with "APPROVED" status found in your college.
                </p>
                <div className="empty-help" style={{ marginTop: '20px', textAlign: 'left', maxWidth: '500px', margin: '20px auto' }}>
                  <p style={{ marginBottom: '10px' }}><strong>Possible reasons:</strong></p>
                  <ul style={{ lineHeight: '1.8' }}>
                    <li>Students status is not set to "APPROVED"</li>
                    <li>Students are not assigned to your college</li>
                    <li>No students exist in the database yet</li>
                  </ul>
                  <p style={{ marginTop: '15px', marginBottom: '10px' }}><strong>Steps to fix:</strong></p>
                  <ol style={{ lineHeight: '1.8' }}>
                    <li>Check backend terminal for detailed logs</li>
                    <li>Open browser console (F12) to see API response</li>
                    <li>Verify students have status "APPROVED" in MongoDB</li>
                    <li>Ensure students are assigned to your college</li>
                  </ol>
                </div>
                <button 
                  onClick={fetchEligibleStudents} 
                  className="btn btn-primary"
                  style={{ marginTop: '15px' }}
                >
                  <FaSyncAlt /> Retry
                </button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="empty-state">
                <FaGraduationCap className="empty-icon" />
                <p className="empty-title">No students match your filters</p>
                <p className="empty-text">
                  Try adjusting your search or filters
                </p>
                <button 
                  onClick={() => { setSearch(""); setSemesterFilter("ALL"); }}
                  className="btn btn-outline-primary"
                  style={{ marginTop: '15px' }}
                >
                  <FaTimes /> Reset Filters
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="checkbox-column">
                        <input
                          type="checkbox"
                          checked={
                            selectedStudents.length ===
                              paginatedStudents.length &&
                            paginatedStudents.length > 0
                          }
                          onChange={handleSelectAll}
                          className="custom-checkbox"
                        />
                      </th>
                      <th>Student</th>
                      <th>Academic Year</th>
                      <th>Total Fee</th>
                      <th>Paid Amount</th>
                      <th>Status</th>
                      <th>Attendance %</th>
                      <th>Attendance Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student) => (
                      <tr key={student._id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student._id)}
                            onChange={() => handleSelectStudent(student._id)}
                            className="custom-checkbox"
                          />
                        </td>
                        <td>
                          <div className="student-name">{student.fullName}</div>
                          <div className="student-email">{student.email}</div>
                        </td>
                        <td>
                          <div>
                            <span className="badge badge-info">
                              {student.academicYearLabel}
                            </span>
                            <div
                              className="text-muted"
                              style={{ fontSize: "12px" }}
                            >
                              Sem {student.currentSemester}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="fee-amount">
                            <FaRupeeSign className="rupee-icon" />
                            {student.fee?.totalFee || 0}
                          </div>
                        </td>
                        <td>
                          <div
                            className={`fee-amount ${
                              student.fee?.paidAmount >= student.fee?.totalFee
                                ? "text-success fw-bold"
                                : "text-muted"
                            }`}
                          >
                            <FaRupeeSign className="rupee-icon" />
                            {student.fee?.paidAmount || 0}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${getFeeStatusBadge(student.feeStatus)}`}
                          >
                            {student.feeStatus === "FULLY_PAID" && (
                              <FaCheckCircle className="badge-icon" />
                            )}
                            {student.feeStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <span className="fw-bold">
                            {student.attendancePercentage ?? 0}%
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${getAttendanceStatusBadge(student.attendanceStatus)}`}
                          >
                            {formatStatus(student.attendanceStatus)}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex" style={{ gap: "8px" }}>
                            <button
                              onClick={() => checkEligibility(student)}
                              className="btn btn-sm btn-info"
                              disabled={eligibilityLoading}
                              title="Check promotion eligibility and view decision details"
                            >
                              <FaClipboardCheck /> Eligibility
                            </button>
                            <button
                              onClick={() => openPromoteModal(student)}
                              className={`btn btn-sm ${
                                student.isFinalYear
                                  ? "btn-secondary disabled"
                                  : "btn-primary"
                              }`}
                              disabled={student.isFinalYear}
                              title={
                                student.isFinalYear
                                  ? "Student in final year - use Move to Alumni"
                                  : "Click to promote"
                              }
                            >
                              <FaArrowUp /> Promote
                            </button>
                            {student.isFinalYear && (
                              <button
                                onClick={() => openAlumniModal(student)}
                                className="btn btn-sm btn-outline-warning"
                                title="Move to Alumni"
                              >
                                <FaGraduationCap /> Move to Alumni
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer">
              <div className="pagination-info">
                Showing <strong>{(page - 1) * PAGE_SIZE + 1}</strong> to{" "}
                <strong>{Math.min(page * PAGE_SIZE, filteredStudents.length)}</strong> of{" "}
                <strong>{filteredStudents.length}</strong> students
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                setPage={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Promote Modal */}
      {showPromoteModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">
                <FaGraduationCap /> Promote Student
              </h4>
              <button
                onClick={() => setShowPromoteModal(false)}
                className="modal-close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              {/* Student Info */}
              <div className="student-info-card">
                <div className="student-name">{selectedStudent.fullName}</div>
                <div className="student-email">{selectedStudent.email}</div>
                <div className="promotion-info">
                  <span className="badge badge-info">
                    {selectedStudent.academicYearLabel}
                    (Sem {selectedStudent.currentSemester}) →
                    {selectedStudent.nextAcademicYearLabel || `Sem ${selectedStudent.currentSemester + 1}`}
                  </span>
                  <span
                    className={`badge ${getFeeStatusBadge(selectedStudent.feeStatus)}`}
                  >
                    {selectedStudent.feeStatus.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Fee Details */}
              <div className="fee-details">
                <div className="fee-row">
                  <span className="fee-label">Total Fee:</span>
                  <span className="fee-value">
                    ₹
                    {selectedStudent.fee?.totalFee ||
                      selectedStudent.totalFee ||
                      0}
                  </span>
                </div>
                <div className="fee-row">
                  <span className="fee-label">Paid Amount:</span>
                  <span
                    className={`fee-value ${
                      (selectedStudent.fee?.paidAmount || 0) >=
                      (selectedStudent.fee?.totalFee ||
                        selectedStudent.totalFee ||
                        0)
                        ? "text-success"
                        : ""
                    }`}
                  >
                    ₹
                    {selectedStudent.fee?.paidAmount ||
                      selectedStudent.paidAmount ||
                      0}
                  </span>
                </div>
                {selectedStudent.pendingAmount > 0 && (
                  <div className="fee-row">
                    <span className="fee-label">Pending:</span>
                    <span className="fee-value text-danger">
                      ₹{selectedStudent.pendingAmount}
                    </span>
                  </div>
                )}
              </div>

              <div className="attendance-details">
                <div className="attendance-row">
                  <span className="attendance-label">Attendance Percentage:</span>
                  <span className="attendance-value fw-bold">
                    {selectedStudent.attendancePercentage ?? 0}%
                  </span>
                </div>
                <div className="attendance-row">
                  <span className="attendance-label">Attendance Status:</span>
                  <span
                    className={`badge ${getAttendanceStatusBadge(selectedStudent.attendanceStatus)}`}
                  >
                    {formatStatus(selectedStudent.attendanceStatus)}
                  </span>
                </div>
                {selectedStudent.attendanceStatus === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE && (
                  <div className="attendance-override">
                    <label className="custom-checkbox-label">
                      <input
                        type="checkbox"
                        checked={overrideAttendanceCheck}
                        onChange={(e) => setOverrideAttendanceCheck(e.target.checked)}
                        className="custom-checkbox"
                      />
                      <span>Override Attendance Check</span>
                    </label>
                    <p className="alert-text" style={{ marginTop: "8px" }}>
                      Attendance Override Reason is required. Minimum 10 characters.
                    </p>
                    {overrideAttendanceCheck && (
                      <input
                        type="text"
                        value={overrideAttendanceReason}
                        onChange={(e) => setOverrideAttendanceReason(e.target.value)}
                        className="form-control"
                        placeholder="Reason (minimum 10 characters)"
                        minLength={10}
                        required
                        aria-label="Attendance override reason"
                      />
                    )}
                    {overrideAttendanceCheck && overrideAttendanceReason.trim().length > 0 && overrideAttendanceReason.trim().length < 10 && (
                      <p className="alert-text text-danger" style={{ marginTop: "8px" }}>
                        Attendance override reason must be at least 10 characters.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Promoted By */}
              <div className="promoted-by-info">
                <div className="info-row">
                  <span className="info-label">Promoted By:</span>
                  <span className="info-value">{promotedByName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Promotion Date:</span>
                  <span className="info-value">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Remarks */}
              <div className="form-group">
                <label className="form-label">Remarks (Optional)</label>
                <textarea
                  value={promotionRemarks}
                  onChange={(e) => setPromotionRemarks(e.target.value)}
                  rows={2}
                  className="form-control"
                  placeholder="Add any notes..."
                />
              </div>

              {/* Override Checkbox - College Admin only */}
              {!admissionOfficerMode && !selectedStudent.allInstallmentsPaid && (
                <div className="alert alert-warning">
                  <label className="custom-checkbox-label">
                    <input
                      type="checkbox"
                      checked={overrideFeeCheck}
                      onChange={(e) => setOverrideFeeCheck(e.target.checked)}
                      className="custom-checkbox"
                    />
                    <span>Override fee check</span>
                  </label>
                  <p className="alert-text">
                    ⚠️ Promote student despite pending fees of ₹
                    {selectedStudent.pendingAmount}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                onClick={handlePromoteStudent}
                disabled={
                  loading ||
                  !selectedStudent ||
                  (!selectedStudent.allInstallmentsPaid && !overrideFeeCheck) ||
                  selectedStudent.attendanceStatus === ATTENDANCE_STATUS.NOT_ELIGIBLE ||
                  (selectedStudent.attendanceStatus === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE &&
                    (!overrideAttendanceCheck || overrideAttendanceReason.trim().length < 10))
                }
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <FaSpinner className="spinner-icon" /> Processing...
                  </>
                ) : (
                  <>
                    <FaCheckCircle /> Confirm Promotion
                  </>
                )}
              </button>
              <button
                onClick={() => setShowPromoteModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Alumni Modal */}
      {showAlumniModal && alumniStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">
                <FaGraduationCap /> Move to Alumni
              </h4>
              <button
                onClick={() => setShowAlumniModal(false)}
                className="modal-close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              {/* Student Info */}
              <div className="student-info-card">
                <div className="student-name">{alumniStudent.fullName}</div>
                <div className="student-email">{alumniStudent.email}</div>
                <div className="promotion-info">
                  <span className="badge badge-warning">
                    <FaGraduationCap /> Final Year Student
                  </span>
                  <span className="badge badge-info ms-2">
                    Sem {alumniStudent.currentSemester}
                  </span>
                </div>
              </div>

              {/* Info Message */}
              <div className="alert alert-info">
                <p className="alert-text">
                  ⚠️ This student has completed their course. Moving to Alumni will:
                </p>
                <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                  <li>Change status from "APPROVED" to "ALUMNI"</li>
                  <li>Remove from active student list</li>
                  <li>Preserve all academic records</li>
                  <li>Enable Alumni login access (future feature)</li>
                </ul>
              </div>

              {/* Graduation Year */}
              <div className="form-group">
                <label className="form-label">Graduation Year</label>
                <select
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(parseInt(e.target.value))}
                  className="form-control"
                >
                  {[new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={handleMoveToAlumni}
                disabled={loading}
                className="btn btn-warning"
              >
                {loading ? (
                  <>
                    <FaSpinner className="spinner-icon" /> Processing...
                  </>
                ) : (
                  <>
                    <FaGraduationCap /> Confirm Move to Alumni
                  </>
                )}
              </button>
              <button
                onClick={() => setShowAlumniModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
</div>
        </div>
      )}

      {/* Eligibility Decision Modal */}
      {showEligibilityModal && eligibilityStudent && (
        <div className="modal-overlay" onClick={() => setShowEligibilityModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "800px", width: "calc(100% - 2rem)", maxHeight: "90vh" }}
          >
            <div className="modal-header">
              <h4 className="modal-title">
                <FaClipboardCheck /> Promotion Eligibility Decision
              </h4>
              <button
                onClick={() => {
                  setShowEligibilityModal(false);
                  setEligibilityStudent(null);
                  setEligibilityData(null);
                  setEligibilityError(null);
                }}
                className="modal-close"
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              {eligibilityLoading ? (
                <div className="loading-container">
                  <FaSpinner className="spinner-icon" />
                  <p>Checking promotion eligibility...</p>
                </div>
              ) : eligibilityError ? (
                <div className="alert alert-danger">
                  <FaExclamationCircle />
                  <div>
                    <p className="alert-text"><strong>Error:</strong> {eligibilityError.message}</p>
                    {eligibilityError.statusCode && (
                      <p className="alert-text" style={{ fontSize: "12px", marginTop: "8px" }}>
                        Status: {eligibilityError.statusCode}
                        {eligibilityError.errorCode && ` | Code: ${eligibilityError.errorCode}`}
                      </p>
                    )}
                  </div>
                </div>
              ) : eligibilityData ? (
                <>
                  {/* Student Header */}
                  <div className="student-info-card">
                    <div className="student-name">{eligibilityStudent.fullName}</div>
                    <div className="student-email">{eligibilityStudent.email}</div>
                    <div className="promotion-info">
                      <span className="badge badge-info">
                        {eligibilityStudent.academicYearLabel} (Sem {eligibilityStudent.currentSemester})
                      </span>
                      <span className="badge badge-secondary">
                        Course: {eligibilityStudent.course_id?.name || "N/A"}
                      </span>
                    </div>
                  </div>

{/* Outcome Badge - Improved UX */}
                   <div className="outcome-banner" style={getOutcomeBannerStyle(eligibilityData.promotion_outcome)}>
                     <div className="outcome-banner-content">
                       <div className="outcome-icon">
                         {getOutcomeIcon(eligibilityData.promotion_outcome)}
                       </div>
                       <div className="outcome-text">
<div className="outcome-label">
                            {getOutcomeDisplayLabel(eligibilityData.promotion_outcome, eligibilityData.workflow_status)}
                          </div>
                         <div className="outcome-reason">
                           {eligibilityData.decision_reason && (
                             <>
                               Reason: {formatDecisionReason(eligibilityData.decision_reason)}
                               {eligibilityData.workflow_status && eligibilityData.workflow_status !== eligibilityData.promotion_outcome && (
                                 <span className="workflow-badge">
                                   Workflow: {formatWorkflowStatus(eligibilityData.workflow_status)}
                                 </span>
                               )}
                             </>
                           )}
                         </div>
                       </div>
                       <div className="outcome-actions">
                         {showRecommend && (
                           <button onClick={openRecommendModal} className="btn btn-sm btn-outline-light" disabled={actionLoading}>
                             <FaClipboardCheck className="mr-1" /> Recommend
                           </button>
                         )}
                         {showApprove && (
                           <button onClick={openApproveModal} className="btn btn-sm btn-light" disabled={actionLoading}>
                             <FaCheckCircle className="mr-1" /> Approve
                           </button>
                         )}
                         {showReject && (
                           <button onClick={openRejectModal} className="btn btn-sm btn-outline-light" disabled={actionLoading}>
                             <FaTimes className="mr-1" /> Reject
                           </button>
                         )}
                         {showExecute && (
                           <button onClick={openExecuteModal} className="btn btn-sm btn-light" disabled={actionLoading}>
                             <FaArrowUp className="mr-1" /> Execute Promotion
                           </button>
                         )}
                       </div>
                     </div>
                   </div>

                  {/* Decision Details Grid */}
                  <div className="decision-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "20px" }}>
                    
                    {/* ATKT Information */}
                    {eligibilityData.promotion_outcome === "ATKT" && (
                      <div className="decision-card atkt-card">
                        <div className="decision-card-header">
                          <FaExclamationTriangle style={{ color: "#f59e0b" }} />
                          <h5 style={{ margin: 0, color: "#92400e" }}>ATKT Details</h5>
                        </div>
                        <div className="decision-card-body">
                          <div className="detail-row">
                            <span className="detail-label">KT Count:</span>
                            <span className="detail-value fw-bold" style={{ fontSize: "18px", color: "#f59e0b" }}>
                              {eligibilityData.kt_count ?? "N/A"}
                            </span>
                          </div>
                          {eligibilityData.policy_snapshot?.maxAllowedKTs !== undefined && eligibilityData.policy_snapshot?.maxAllowedKTs !== null && (
                            <div className="detail-row">
                              <span className="detail-label">Max Allowed KTs:</span>
                              <span className="detail-value">{eligibilityData.policy_snapshot?.maxAllowedKTs}</span>
                            </div>
                          )}
                          {eligibilityData.failed_subject_ids && eligibilityData.failed_subject_ids.length > 0 && (
                            <div className="detail-row">
                              <span className="detail-label">Failed Subjects:</span>
                              <div className="detail-value">
                                <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
                                  {eligibilityData.failed_subject_ids.map((subj, idx) => {
                                    const displayName =
                                      typeof subj === "string"
                                        ? subj
                                        : subj?.name
                                          ? `${subj.name}${subj.code ? ` (${subj.code})` : ""}`
                                          : subj?.code || subj?._id || String(subj);
                                    return (
                                      <li key={idx} style={{ fontSize: "13px" }}>
                                        {displayName}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          )}
                          {eligibilityData.backlog_ids && eligibilityData.backlog_ids.length > 0 && (
                            <div className="detail-row">
                              <span className="detail-label">Backlog Records:</span>
                              <span className="detail-value">
                                {eligibilityData.backlog_ids.length} backlog record{eligibilityData.backlog_ids.length === 1 ? "" : "s"}
                                <span
                                  className="text-muted"
                                  style={{ fontSize: "11px", display: "block", marginTop: "4px" }}
                                >
                                  See Backlog Details table below for subject-level information
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Attendance Snapshot - Improved UX */}
                    {eligibilityData.attendance_snapshot && (() => {
                      const snap = eligibilityData.attendance_snapshot;
                      const percentage = snap.percentage ?? 0;
                      const required = snap.requiredPercentage ?? 75;
                      const passed = snap.passed === true;
                      const status = snap.status || (passed ? "ELIGIBLE" : "NOT_ELIGIBLE");
                      const isOverride = snap.overridden === true;

                      return (
                        <div className="decision-card attendance-snapshot-card">
                          <div className="decision-card-header">
                            <FaInfoCircle style={{ color: "#3db5e6" }} />
                            <h5 style={{ margin: 0, color: "#0f3a4a", flex: 1 }}>Attendance Snapshot</h5>
                            <span className={`badge ${passed ? "badge-success" : "badge-danger"}`}>
                              {formatStatus(status)}
                            </span>
                          </div>
                          <div className="decision-card-body">
                            {/* Progress Bar */}
                            <div className="attendance-progress-section">
                              <div className="progress-header">
                                <span className="progress-label">Attendance Percentage</span>
                                <span className="progress-value">{percentage}%</span>
                              </div>
                              <div className="progress-bar-container">
                                <div 
                                  className="progress-bar-fill"
                                  style={{ 
                                    width: `${Math.min(percentage, 100)}%`,
                                    background: passed 
                                      ? "linear-gradient(90deg, #059669 0%, #10b981 100%)"
                                      : "linear-gradient(90deg, #ef4444 0%, #f87171 100%)"
                                  }}
                                ></div>
                              </div>
                              <div className="progress-markers">
                                <span className="marker current">Current: {percentage}%</span>
                                <span className="marker required">Required: {required}%</span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="attendance-details-grid">
                              <div className="detail-item">
                                <span className="detail-label">Total Sessions</span>
                                <span className="detail-value">{snap.totalSessions ?? "-"}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Override Applied</span>
                                <span className={`detail-value ${isOverride ? "override-yes" : "override-no"}`}>
                                  {isOverride ? "Yes" : "No"}
                                </span>
                              </div>
                              {isOverride && snap.overrideReason && (
                                <div className="detail-item override-reason" style={{ gridColumn: "1 / -1" }}>
                                  <span className="detail-label">Override Reason</span>
                                  <span className="detail-value">{snap.overrideReason}</span>
                                </div>
                              )}
                            </div>

                            {/* Status Message */}
                            <div className={`attendance-status-message ${passed ? "passed" : "failed"}`}>
                              {passed ? (
                                <>
                                  <FaCheckCircle style={{ marginRight: "8px" }} />
                                  Student meets the minimum attendance requirement ({required}%).
                                </>
                              ) : (
                                <>
                                  <FaExclamationTriangle style={{ marginRight: "8px" }} />
                                  Student does NOT meet the minimum attendance requirement ({required}%). Shortfall: {required - percentage}%.
                                </>
                              )}
                              {isOverride && (
                                <div className="override-notice">
                                  <FaInfoCircle style={{ marginRight: "6px", fontSize: "14px" }} />
                                  Attendance check was overridden. {snap.overrideReason && `Reason: ${snap.overrideReason}`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Fee Clearance Snapshot - Improved UX */}
                    {eligibilityData.fee_clearance_snapshot && (() => {
                      const snap = eligibilityData.fee_clearance_snapshot;
                      const totalFee = snap.totalFee ?? 0;
                      const paidAmount = snap.paidAmount ?? 0;
                      const pendingAmount = snap.pendingAmount ?? 0;
                      const requiredClearance = snap.requiredClearance !== false;
                      const cleared = snap.cleared === true;
                      const passed = snap.passed === true;
                      const status = snap.status || (cleared ? "CLEARED" : "PARTIALLY_PAID");
                      const isOverride = snap.overridden === true;
                      const progressPercent = totalFee > 0 ? Math.round((paidAmount / totalFee) * 100) : 0;

                      const formatCurrency = (amount) => {
                        if (amount === null || amount === undefined) return "-";
                        return new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(amount);
                      };

                      return (
                        <div className="decision-card fee-snapshot-card">
                          <div className="decision-card-header">
                            <FaDollarSign style={{ color: "#059669" }} />
                            <h5 style={{ margin: 0, color: "#0f3a4a", flex: 1 }}>Fee Clearance Snapshot</h5>
                            <span className={`badge ${passed ? "badge-success" : "badge-warning"}`}>
                              {passed ? "Cleared" : status.replace("_", " ")}
                            </span>
                          </div>
                          <div className="decision-card-body">
                            {/* Progress Bar */}
                            <div className="fee-progress-section">
                              <div className="progress-header">
                                <span className="progress-label">Fee Payment Progress</span>
                                <span className="progress-value">{progressPercent}%</span>
                              </div>
                              <div className="progress-bar-container">
                                <div 
                                  className="progress-bar-fill"
                                  style={{ 
                                    width: `${Math.min(progressPercent, 100)}%`,
                                    background: passed 
                                      ? "linear-gradient(90deg, #059669 0%, #10b981 100%)"
                                      : "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)"
                                  }}
                                ></div>
                              </div>
                              <div className="progress-markers">
                                <span className="marker paid">Paid: {formatCurrency(paidAmount)}</span>
                                <span className="marker total">Total: {formatCurrency(totalFee)}</span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="fee-details-grid">
                              <div className="detail-item highlight">
                                <span className="detail-label">Total Fee</span>
                                <span className="detail-value">{formatCurrency(totalFee)}</span>
                              </div>
                              <div className="detail-item highlight">
                                <span className="detail-label">Amount Paid</span>
                                <span className="detail-value paid-amount">{formatCurrency(paidAmount)}</span>
                              </div>
                              <div className="detail-item highlight">
                                <span className="detail-label">Pending Amount</span>
                                <span className="detail-value pending-amount">{formatCurrency(pendingAmount)}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Clearance Required</span>
                                <span className={`detail-value ${requiredClearance ? "clearance-yes" : "clearance-no"}`}>
                                  {requiredClearance ? "Yes" : "No"}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Override Applied</span>
                                <span className={`detail-value ${isOverride ? "override-yes" : "override-no"}`}>
                                  {isOverride ? "Yes" : "No"}
                                </span>
                              </div>
                              {isOverride && snap.overrideReason && (
                                <div className="detail-item override-reason" style={{ gridColumn: "1 / -1" }}>
                                  <span className="detail-label">Override Reason</span>
                                  <span className="detail-value">{snap.overrideReason}</span>
                                </div>
                              )}
                            </div>

                            {/* Status Message */}
                            <div className={`fee-status-message ${passed ? "passed" : "failed"}`}>
                              {passed ? (
                                <>
                                  <FaCheckCircle style={{ marginRight: "8px" }} />
                                  All fees cleared. Student is eligible for promotion.
                                </>
                              ) : (
                                <>
                                  <FaExclamationTriangle style={{ marginRight: "8px" }} />
                                  Pending fee payment of {formatCurrency(pendingAmount)}. 
                                  {requiredClearance && " Fee clearance is required for promotion."}
                                </>
                              )}
                              {isOverride && (
                                <div className="override-notice">
                                  <FaInfoCircle style={{ marginRight: "6px", fontSize: "14px" }} />
                                  Fee check was overridden. {snap.overrideReason && `Reason: ${snap.overrideReason}`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Policy Snapshot - Improved UX */}
                    {eligibilityData.policy_snapshot && (
                      <div className="decision-card policy-snapshot-card">
                        <div className="decision-card-header">
                          <FaFileAlt style={{ color: "#9C27B0" }} />
                          <h5 style={{ margin: 0, color: "#0f3a4a" }}>Promotion Policy Applied</h5>
                          <span className="badge badge-secondary" style={{ fontSize: "11px", fontWeight: "500" }}>
                            Version: {formatDate(eligibilityData.policy_version)}
                          </span>
                        </div>
                        <div className="decision-card-body">
                          <div className="policy-snapshot-grid">
                            {/* Min Attendance */}
                            <div className="policy-snapshot-item">
                              <div className="policy-icon attendance">
                                <FaUsers style={{ fontSize: "18px" }} />
                              </div>
                              <div className="policy-content">
                                <span className="policy-label">Minimum Attendance</span>
                                <span className="policy-value">
                                  {eligibilityData.policy_snapshot.minAttendancePercentage !== undefined && eligibilityData.policy_snapshot.minAttendancePercentage !== null
                                    ? `${eligibilityData.policy_snapshot.minAttendancePercentage}%`
                                    : <span className="text-muted">Not configured</span>}
                                </span>
                                <span className="policy-desc">Student must meet this attendance %</span>
                              </div>
                            </div>

                            {/* Max Allowed KTs */}
                            <div className="policy-snapshot-item">
                              <div className="policy-icon kt">
                                <FaExclamationTriangle style={{ fontSize: "18px" }} />
                              </div>
                              <div className="policy-content">
                                <span className="policy-label">Max Allowed KTs (Backlogs)</span>
                                <span className="policy-value">
                                  {eligibilityData.policy_snapshot.maxAllowedKTs !== undefined && eligibilityData.policy_snapshot.maxAllowedKTs !== null
                                    ? eligibilityData.policy_snapshot.maxAllowedKTs
                                    : <span className="text-muted">Not configured</span>}
                                </span>
                                <span className="policy-desc">Maximum backlogs permitted for promotion</span>
                              </div>
                            </div>

                            {/* Scoped Semesters */}
                            <div className="policy-snapshot-item">
                              <div className="policy-icon semester">
                                <FaGraduationCap style={{ fontSize: "18px" }} />
                              </div>
                              <div className="policy-content">
                                <span className="policy-label">Applicable Semesters</span>
                                <span className="policy-value">
                                  {eligibilityData.policy_snapshot.scopedSemesters && eligibilityData.policy_snapshot.scopedSemesters.length > 0
                                    ? eligibilityData.policy_snapshot.scopedSemesters.map((s, i) => (
                                        <span key={i} className="semester-chip">Sem {s}</span>
                                      ))
                                    : <span className="text-muted">All Semesters</span>}
                                </span>
                                <span className="policy-desc">Policy scope (empty = all semesters)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

{/* Backlog Details (Step 5 - read-only backlog management) - Improved UX */}
                    <div className="decision-card backlog-card" style={{ marginTop: "16px" }}>
                      <div className="decision-card-header">
                        <FaClipboardCheck style={{ color: "#3db5e6" }} />
                        <h5 style={{ margin: 0, color: "#0f3a4a", flex: 1 }}>Backlog Details (ATKT)</h5>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`badge ${backlogs.length > 0 ? "badge-info" : "badge-success"}`} style={{ fontSize: "12px" }}>
                            {backlogs.length} record{backlogs.length === 1 ? "" : "s"}
                          </span>
                          {backlogs.length > 0 && (
                            <span className="backlog-summary text-muted" style={{ fontSize: "11px" }}>
                              {(() => {
                                const open = backlogs.filter(b => b.status === "OPEN").length;
                                const attempted = backlogs.filter(b => b.status === "ATTEMPTED").length;
                                const cleared = backlogs.filter(b => b.status === "CLEARED").length;
                                return `Open: ${open} | Attempted: ${attempted} | Cleared: ${cleared}`;
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="decision-card-body">
                        {/* Status filter */}
                        <div className="backlog-filter" style={{ marginBottom: "16px" }}>
                          <div className="filter-group" style={{ flexWrap: "wrap", gap: "8px" }}>
                            {["ALL", "OPEN", "ATTEMPTED", "CLEARED"].map((status) => (
                              <button
                                key={status}
                                onClick={() => setBacklogStatusFilter(status)}
                                className={`btn btn-sm ${backlogStatusFilter === status ? "btn-primary" : "btn-outline-secondary"}`}
                                disabled={backlogLoading}
                              >
                                {status === "ALL" ? "All" : status}
                                {status !== "ALL" && (
                                  <span className="filter-count ms-1">
                                    {backlogs.filter(b => b.status === status).length}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Loading state */}
                        {backlogLoading ? (
                          <div className="loading-container" style={{ padding: "30px 0", textAlign: "center" }}>
                            <FaSpinner className="spinner-icon" style={{ fontSize: "32px", color: "#3db5e6" }} />
                            <p style={{ marginTop: "12px", color: "#64748b" }}>Loading backlog records...</p>
                          </div>
                        ) : backlogError ? (
                          <div className="alert alert-danger" style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                            <FaExclamationCircle style={{ fontSize: "20px", marginTop: "2px" }} />
                            <div>
                              <p className="alert-text" style={{ margin: 0 }}><strong>Error:</strong> {backlogError.message}</p>
                              {backlogError.statusCode && (
                                <p className="alert-text" style={{ fontSize: "12px", marginTop: "8px", marginBottom: 0 }}>
                                  Status: {backlogError.statusCode}
                                  {backlogError.errorCode && ` | Code: ${backlogError.errorCode}`}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : backlogs.length === 0 ? (
                          <div className="empty-state backlog-empty-state" style={{ padding: "48px 24px", textAlign: "center" }}>
                            <div className="empty-icon-wrapper">
                              <FaClipboardCheck className="empty-icon" style={{ fontSize: "56px", color: "#94a3b8" }} />
                            </div>
                            <p className="empty-title" style={{ marginTop: "16px", fontSize: "18px", fontWeight: 600, color: "#1e293b" }}>
                              No Backlog Records
                            </p>
                            <p className="empty-text" style={{ marginTop: "8px", color: "#64748b", maxWidth: "400px", margin: "8px auto 0" }}>
                              {backlogStatusFilter === "ALL"
                                ? "This student has no ATKT/backlog records. They are clear to promote."
                                : `No backlog records with status "${backlogStatusFilter}". Try "All" to see all records.`}
                            </p>
                            {backlogStatusFilter !== "ALL" && (
                              <button
                                onClick={() => setBacklogStatusFilter("ALL")}
                                className="btn btn-outline-primary mt-3"
                                style={{ fontSize: "13px" }}
                              >
                                <FaSyncAlt className="mr-1" /> Show All Statuses
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="data-table backlog-table">
                              <thead>
                                <tr>
                                  <th style={{ minWidth: "240px" }}>Subject</th>
                                  <th style={{ width: "90px" }}>Semester</th>
                                  <th style={{ width: "140px" }}>Academic Year</th>
                                  <th style={{ width: "110px" }}>Status</th>
                                  <th style={{ width: "90px", textAlign: "center" }}>Attempts</th>
                                  <th style={{ width: "120px" }}>Created</th>
                                  <th style={{ width: "120px" }}>Cleared</th>
                                  <th style={{ width: "130px" }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {backlogs.map((backlog) => (
                                  <tr key={backlog._id} className="backlog-row">
                                    <td>
                                      <div className="backlog-subject">
                                        <div className="subject-name">{backlog.subject_name || "-"}</div>
                                        {backlog.subject_code && (
                                          <span className="subject-code">Code: {backlog.subject_code}</span>
                                        )}
                                        {backlog.subject_type && (
                                          <span className="subject-type">{backlog.subject_type}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <span className="badge badge-info badge-sm">
                                        Sem {backlog.semester ?? "-"}
                                      </span>
                                    </td>
                                    <td className="text-muted" style={{ fontSize: "13px" }}>
                                      {backlog.academicYear || "-"}
                                    </td>
                                    <td>
                                      <span className={getBacklogStatusBadge(backlog.status)}>
                                        {backlog.status ? backlog.status.replace(/_/g, " ") : "-"}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      <span className="attempt-count">{backlog.attempt_count ?? 0}</span>
                                    </td>
                                    <td className="text-muted" style={{ fontSize: "12px" }}>
                                      {formatDate(backlog.created_at)}
                                    </td>
                                    <td className="text-muted" style={{ fontSize: "12px" }}>
                                      {backlog.cleared_at ? formatDate(backlog.cleared_at) : <span className="text-muted">-</span>}
                                    </td>
                                    <td>
                                      <button
                                        onClick={() => openAttemptsModal(backlog)}
                                        className="btn btn-sm btn-info view-attempts-btn"
                                        title="View and manage backlog attempts"
                                        disabled={backlogLoading}
                                      >
                                        <FaEye className="mr-1" /> View Attempts
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                   </div>

                  {/* Raw Decision Data (for debugging) removed */}
                </>
              ) : (
                <div className="empty-state">
                  <FaClipboardCheck className="empty-icon" style={{ color: "#cbd5e1" }} />
                  <p className="empty-title">No Decision Data</p>
                  <p className="empty-text">Eligibility check returned no data.</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {showRecommend && (
                <button
                  onClick={openRecommendModal}
                  disabled={actionLoading}
                  className="btn btn-outline-info"
                  style={{ flex: 1 }}
                >
                  <FaClipboardCheck /> Recommend Promotion
                </button>
              )}
              {showApprove && (
                <button
                  onClick={openApproveModal}
                  disabled={actionLoading}
                  className="btn btn-success"
                  style={{ flex: 1 }}
                >
                  <FaCheckCircle /> Approve Promotion
                </button>
              )}
              {showReject && (
                <button
                  onClick={openRejectModal}
                  disabled={actionLoading}
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                >
                  <FaTimes /> Reject Promotion
                </button>
              )}
              {showExecute && (
                <button
                  onClick={openExecuteModal}
                  disabled={actionLoading}
                  className="btn btn-warning"
                  style={{ flex: 1 }}
                >
                  <FaArrowUp /> Execute Promotion
                </button>
              )}
              <button
                onClick={() => {
                  setShowEligibilityModal(false);
                  setEligibilityStudent(null);
                  setEligibilityData(null);
                  setEligibilityError(null);
                }}
                className="btn btn-primary"
              >
                <FaTimes /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backlog Attempts Modal (Step 6 - attempt history / creation UI) */}
      {showAttemptsModal && selectedBacklog && (
        <div className="modal-overlay" onClick={closeAttemptsModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "720px", width: "calc(100% - 2rem)", maxHeight: "90vh" }}
          >
            <div className="modal-header">
              <h4 className="modal-title">
                <FaClipboardCheck /> Backlog Attempts
              </h4>
              <button
                onClick={closeAttemptsModal}
                className="modal-close"
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              {/* Backlog summary */}
              <div className="student-info-card" style={{ marginBottom: "16px" }}>
                <div className="student-name" style={{ textTransform: "none" }}>
                  {selectedBacklog.subject_name || "-"}
                </div>
                <div className="student-email">
                  {selectedBacklog.subject_code && `Code: ${selectedBacklog.subject_code}`}
                  {selectedBacklog.subject_type && ` | Type: ${selectedBacklog.subject_type}`}
                  {selectedBacklog.semester && ` | Sem ${selectedBacklog.semester}`}
                  {selectedBacklog.academicYear && ` | ${selectedBacklog.academicYear}`}
                </div>
                <div className="promotion-info" style={{ marginTop: "8px" }}>
                  <span className={getBacklogStatusBadge(selectedBacklog.status)}>
                    {selectedBacklog.status ? selectedBacklog.status.replace(/_/g, " ") : "-"}
                  </span>
                  <span className="badge badge-info ms-2">
                    Attempts: {selectedBacklog.attempt_count ?? 0}
                  </span>
                </div>
              </div>

              {/* Create attempt action */}
              <div className="backlog-create-attempt" style={{ marginBottom: "16px" }}>
                {selectedBacklog.status === "OPEN" ? (
                  <button
                    onClick={openCreateAttemptConfirm}
                    disabled={attemptActionLoading}
                    className="btn btn-success"
                  >
                    <FaCheckCircle /> Create Attempt
                  </button>
                ) : (
                  <p className="alert-text text-muted" style={{ margin: 0 }}>
                    {selectedBacklog.status === "CLEARED"
                      ? "This backlog has been cleared. No further attempts can be created."
                      : "Create Attempt is only available for backlogs with OPEN status."}
                  </p>
                )}
                {attemptCreateError && (
                  <div className="alert alert-danger" style={{ marginTop: "12px" }}>
                    <FaExclamationCircle />
                    <div>
                      <p className="alert-text"><strong>Error:</strong> {attemptCreateError.message}</p>
                      {attemptCreateError.statusCode && (
                        <p className="alert-text" style={{ fontSize: "12px", marginTop: "8px" }}>
                          Status: {attemptCreateError.statusCode}
                          {attemptCreateError.errorCode && ` | Code: ${attemptCreateError.errorCode}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Attempts list */}
              {attemptsLoading ? (
                <div className="loading-container" style={{ padding: "30px 0" }}>
                  <FaSpinner className="spinner-icon" style={{ fontSize: "32px" }} />
                  <p style={{ marginTop: "12px" }}>Loading attempts...</p>
                </div>
              ) : attemptsError ? (
                <div className="alert alert-danger">
                  <FaExclamationCircle />
                  <div>
                    <p className="alert-text"><strong>Error:</strong> {attemptsError.message}</p>
                    {attemptsError.statusCode && (
                      <p className="alert-text" style={{ fontSize: "12px", marginTop: "8px" }}>
                        Status: {attemptsError.statusCode}
                        {attemptsError.errorCode && ` | Code: ${attemptsError.errorCode}`}
                      </p>
                    )}
                  </div>
                </div>
              ) : attempts.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px 20px" }}>
                  <FaClipboardCheck className="empty-icon" style={{ fontSize: "64px", color: "#cbd5e1" }} />
                  <p className="empty-title" style={{ marginTop: "12px" }}>No attempts found</p>
                  <p className="empty-text">
                    {selectedBacklog.status === "OPEN"
                      ? "No attempts have been created for this backlog yet."
                      : "No attempts exist for this backlog."}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table attempt-table">
                    <thead>
                      <tr>
                        <th>Attempt #</th>
                        <th>Status</th>
                        <th>Exam</th>
                        <th>Attempted</th>
                        <th>Evaluated</th>
                        <th>Marks</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((attempt) => (
                        <tr key={attempt._id}>
                          <td>
                            <span className="badge badge-info">
                              #{attempt.attempt_number ?? "-"}
                            </span>
                          </td>
                          <td>
                            <span className={getAttemptStatusBadge(attempt.result_status)}>
                              {attempt.result_status
                                ? attempt.result_status.replace(/_/g, " ")
                                : "-"}
                            </span>
                          </td>
                          <td>
                            <div className="student-name" style={{ textTransform: "none", fontSize: "13px" }}>
                              {attempt.exam_name || "-"}
                            </div>
                            {attempt.exam_type && (
                              <div className="student-email">
                                Type: {attempt.exam_type}
                              </div>
                            )}
                          </td>
                          <td className="text-muted" style={{ fontSize: "12px" }}>
                            {formatDateTime(attempt.attempted_at)}
                          </td>
                          <td className="text-muted" style={{ fontSize: "12px" }}>
                            {formatDateTime(attempt.evaluated_at)}
                          </td>
                          <td>
                            {attempt.total_marks !== undefined && attempt.total_marks !== null ? (
                              <span className="fw-bold">
                                {attempt.internal_marks ?? 0} + {attempt.external_marks ?? 0} = {attempt.total_marks}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {attempt.passed === true && (
                              <span className="badge badge-success">Passed</span>
                            )}
                            {attempt.passed === false && (
                              <span className="badge badge-danger">Failed</span>
                            )}
                            {attempt.passed !== true && attempt.passed !== false && (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                onClick={closeAttemptsModal}
                className="btn btn-secondary"
              >
                <FaTimes /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execute Confirmation Modal */}
      {showExecuteModal && eligibilityStudent && eligibilityData && (
        <ConfirmModal
          isOpen={showExecuteModal}
          onClose={() => setShowExecuteModal(false)}
          onConfirm={handleExecute}
          title="Execute Promotion"
          message={`Are you sure you want to execute this promotion?\n\n` +
            `Student: ${eligibilityStudent.fullName}\n` +
            `Current Semester: Sem ${eligibilityStudent.currentSemester}\n` +
            `Target Semester: Sem ${eligibilityStudent.currentSemester + 1}\n` +
            `Outcome: ${formatOutcome(eligibilityData.promotion_outcome)}\n` +
            `Workflow Status: ${formatWorkflowStatus(eligibilityData.workflow_status)}\n` +
            (eligibilityData.promotion_outcome === "ATKT"
              ? `KT Count: ${eligibilityData.kt_count ?? "N/A"}\n`
              : "") +
            `\n⚠️ This is the final promotion execution action and will change the student's promotion state.`}
          type="warning"
          confirmText="Execute"
          cancelText="Cancel"
          isLoading={actionLoading}
        />
      )}

      {/* Recommend Confirmation Modal */}
      {showRecommendModal && eligibilityStudent && (
        <ConfirmModal
          isOpen={showRecommendModal}
          onClose={() => setShowRecommendModal(false)}
          onConfirm={handleRecommend}
          title="Recommend Promotion"
          message="Are you sure you want to recommend this promotion decision? This will move the workflow from Draft to Recommended."
          type="info"
          confirmText="Recommend"
          cancelText="Cancel"
          isLoading={actionLoading}
          inputValue={recommendComment}
          onInputChange={setRecommendComment}
          inputPlaceholder="Optional comment for the recommendation..."
          inputRows={3}
        />
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && eligibilityStudent && (
        <ConfirmModal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          onConfirm={handleApprove}
          title="Approve Promotion"
          message="Are you sure you want to approve this promotion decision? This will move the workflow to Approved."
          type="success"
          confirmText="Approve"
          cancelText="Cancel"
          isLoading={actionLoading}
          inputValue={approveComment}
          onInputChange={setApproveComment}
          inputPlaceholder="Optional approval comment..."
          inputRows={3}
        />
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && eligibilityStudent && (
        <ConfirmModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setRejectReason("");
            setRejectReasonError("");
          }}
          onConfirm={handleReject}
          title="Reject Promotion"
          message="Are you sure you want to reject this promotion decision?"
          type="danger"
          confirmText="Reject"
          cancelText="Cancel"
          isLoading={actionLoading}
          inputValue={rejectReason}
          onInputChange={(val) => {
            setRejectReason(val);
            if (rejectReasonError) setRejectReasonError("");
          }}
          inputPlaceholder="Provide a reason for rejection (required)..."
          inputRows={3}
          inputError={rejectReasonError}
          confirmDisabled={actionLoading || !rejectReason.trim()}
        />
      )}

      {/* Confirm Modal */}
       {showConfirmModal && (
         <ConfirmModal
           isOpen={showConfirmModal}
           onClose={() => setShowConfirmModal(false)}
           onConfirm={() => {
             confirmConfig.onConfirm();
             setShowConfirmModal(false);
           }}
           title={confirmConfig.title}
           message={confirmConfig.message}
           type={confirmConfig.type}
         />
       )}

       {/* Bulk Promotion Result Modal */}
       {showBulkResultModal && bulkResultData && (
         <div
           className="modal-overlay"
           onClick={() => setShowBulkResultModal(false)}
           role="dialog"
           aria-modal="true"
           aria-label="Bulk Promotion Result"
         >
           <div
             className="modal-content"
             onClick={(e) => e.stopPropagation()}
             style={{ maxWidth: "700px", width: "calc(100% - 2rem)" }}
           >
             <div className="modal-header">
               <h4 className="modal-title">
                 <FaGraduationCap /> Bulk Promotion Result
               </h4>
               <button
                 onClick={() => setShowBulkResultModal(false)}
                 className="modal-close"
                 aria-label="Close"
               >
                 <FaTimes />
               </button>
             </div>
             <div className="modal-body">
               {/* Summary */}
               <div className="bulk-result-summary">
                 <div className="bulk-result-stat">
                   <span className="bulk-result-count text-success">
                     {bulkSuccessCount}
                   </span>
                   <span className="bulk-result-label">
                     Promoted Successfully
                   </span>
                 </div>
                 <div className="bulk-result-stat">
                   <span className="bulk-result-count text-danger">
                     {bulkResultData.length}
                   </span>
                   <span className="bulk-result-label">
                     Could Not Be Promoted
                   </span>
                 </div>
               </div>

{/* Failed Students Table */}
                {bulkResultData.length > 0 && (
                  <div className="bulk-result-failed">
                    <h5 className="bulk-result-failed-title">
                      <FaExclamationTriangle className="text-warning" /> Students
                      Not Promoted
                    </h5>
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Reason(s)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkResultData.map((f, index) => {
                            const reasons = f.reasons || (f.reason ? [f.reason] : []);
                            return (
                              <tr key={index}>
                                <td>
                                  <div className="student-name">
                                    {f.studentName || "Unknown"}
                                  </div>
                                </td>
                                <td>
                                  <ul className="bulk-reason-list">
                                    {reasons.map((r, i) => (
                                      <li key={i} className="text-danger">
                                        {r || "Promotion failed"}
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
             </div>
             <div className="modal-footer">
               <button
                 onClick={() => setShowBulkResultModal(false)}
                 className="btn btn-primary"
               >
                 Close
               </button>
             </div>
           </div>
         </div>
       )}

      {/* Custom Styles */}
      <style>{`
        .page-container {
          padding: 24px;
          background: #f0f4f8;
          min-height: 100vh;
        }
        //For academic year column(Sem1)
        .data-table td:nth-child(3) {
          vertical-align: middle;
        }

        .data-table td:nth-child(3) > div {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }
        
        /* Fix Eligible Students header overlap */
          .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
          }

          .card-header-actions {
            display: flex;
            align-items: center;
            gap: 20px;
            flex-shrink: 0;
            white-space: nowrap;
          }

          .card-header-actions .text-muted {
            display: inline-block;
          }

          .card-header-actions .badge {
            margin-left: 0 !important;
          }


        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          background: linear-gradient(135deg, #0f3a4a 0%, #3db5e6 100%);
          padding: 28px 32px;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(15, 58, 74, 0.3);
          color: white;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
        }

        .header-icon {
          color: white;
          font-size: 32px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.95);
          font-size: 15px;
          margin-top: 6px;
          font-weight: 400;
        }

        .erp-page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          background: linear-gradient(135deg, #0f3a4a 0%, #3db5e6 100%);
          padding: 28px 32px;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(15, 58, 74, 0.3);
          color: white;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .history-back-btn {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border: 2px solid rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(10px);
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          text-decoration: none;
          line-height: 1.4;
        }

        .history-back-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.6);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
          color: #ffffff;
        }

        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .erp-header-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          color: white;
          backdrop-filter: blur(10px);
          flex-shrink: 0;
        }

        .erp-header-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .erp-page-title {
          font-size: 26px;
          font-weight: 700;
          color: white;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .erp-page-subtitle {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          margin: 0;
          font-weight: 400;
        }

        .record-count {
          background: rgba(61, 181, 230, 0.15);
          color: #0f3a4a;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .table-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(15, 58, 74, 0.06);
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .erp-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .erp-card-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #0f3a4a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .erp-card-icon {
          color: #3db5e6;
          font-size: 20px;
        }

        .erp-card-body {
          padding: 0;
        }

        .erp-card-body .table-responsive {
          border-radius: 0;
        }

        .stat-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
          color: white;
        }

        .stat-card-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-card-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-card-value {
          font-size: 28px;
          font-weight: 800;
          color: #0f3a4a;
          line-height: 1;
        }
          background: rgba(255, 255, 255, 0.15);
          color: skyblue;
          border: 2px solid rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(10px);
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn-outline-primary:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.6);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
          color: skyblue;
          font-weight: bold;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(15, 58, 74, 0.08);
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 28px rgba(15, 58, 74, 0.15);
          border-color: #3db5e6;
        }

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          flex-shrink: 0;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.15) 0%, rgba(61, 181, 230, 0.08) 100%);
          color: #3db5e6;
        }

        .stat-card:hover .stat-icon {
          transform: scale(1.1) rotate(5deg);
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          color: white;
        }

        .stat-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 800;
          color: #0f3a4a;
          line-height: 1;
        }

        .filter-bar {
          background: white;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 20px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          box-shadow: 0 4px 16px rgba(15, 58, 74, 0.06);
          border: 1px solid #e2e8f0;
        }

        .search-box {
          flex: 1;
          min-width: 280px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #3db5e6;
          font-size: 16px;
        }

        .clear-search-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: #f1f5f9;
          border: none;
          border-radius: 6px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #64748b;
        }

        .clear-search-btn:hover {
          background: #e2e8f0;
          color: #0f3a4a;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.3s ease;
          background: white;
        }

        .search-input:focus {
          border-color: #3db5e6;
          box-shadow: 0 0 0 4px rgba(61, 181, 230, 0.1);
          outline: none;
        }

        .search-input::placeholder {
          color: #94a3b8;
        }

        .filter-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .filter-select {
          padding: 12px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          color: #334155;
        }

        .filter-select:focus {
          border-color: #3db5e6;
          outline: none;
          box-shadow: 0 0 0 4px rgba(61, 181, 230, 0.1);
        }

        .filter-select:hover {
          border-color: #3db5e6;
        }

        .card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(15, 58, 74, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
        }

        .card:hover {
          box-shadow: 0 8px 24px rgba(15, 58, 74, 0.12);
        }

        .card-header {
          padding: 20px 24px;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        }

        .card-title {
          font-size: 20px;
          font-weight: 700;
          color: #0f3a4a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-body {
          padding: 24px;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table thead th {
          padding: 16px 20px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
          letter-spacing: 1px;
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
          border-bottom: none;
          opacity: 0.95;
        }

        .data-table thead th:first-child {
          border-top-left-radius: 12px;
        }

        .data-table thead th:last-child {
          border-top-right-radius: 12px;
        }

        .data-table tbody td {
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .data-table tbody tr {
          transition: all 0.25s ease;
        }

        .data-table tbody tr:hover {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.1);
        }

        .student-name {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          font-weight: 700;
          color: #0f3a4a;
          font-size: 15px;
          letter-spacing: 0.3px;
          text-transform: capitalize;
        }

        .student-email {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
          font-weight: 400;
          letter-spacing: 0.2px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 24px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge-success {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
        }

        .badge-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
        }

        .badge-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
        }

        .badge-info {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(15, 58, 74, 0.3);
        }

        .badge-secondary {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(107, 114, 128, 0.3);
        }

        .attendance-details {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          border: 1px solid #bae6fd;
        }

        .attendance-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #bae6fd;
        }

        .attendance-row:last-child {
          border-bottom: none;
        }

        .attendance-label {
          color: #64748b;
          font-size: 14px;
          font-weight: 600;
        }

        .attendance-value {
          font-weight: 700;
          color: #0f3a4a;
          font-size: 15px;
        }

        .attendance-override {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #bae6fd;
        }

        .bulk-action-overrides {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 280px;
          padding: 10px;
          border: 1px dashed #f59e0b;
          border-radius: 12px;
          background: #fffbeb;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3db5e6 0%, #1c7ed6 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #1c7ed6 0%, #3db5e6 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(61, 181, 230, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          color: white;
          box-shadow: 0 3px 10px rgba(107, 114, 128, 0.3);
        }

        .btn-secondary:hover {
          background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
          box-shadow: 0 5px 12px rgba(107, 114, 128, 0.4);
        }

        .btn-outline-secondary {
          background: white;
          color: #64748b;
          border: 1.5px solid #e2e8f0;
          font-weight: 600;
        }

        .btn-outline-secondary:hover {
          background: #f1f5f9;
          color: #0f3a4a;
          border-color: #cbd5e1;
        }

        .btn-info {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(15, 58, 74, 0.3);
        }

        .btn-info:hover:not(:disabled) {
          background: linear-gradient(135deg, #1a5263 0%, #0f3a4a 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 58, 74, 0.4);
        }

        .btn-info:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-sm {
          padding: 8px 16px;
          font-size: 13px;
        }

        .btn-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        .btn-warning:hover:not(:disabled) {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
          box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
        }

        .btn-outline-warning {
          background: white;
          color: #d97706;
          border: 2px solid #fcd34d;
          font-weight: 600;
        }

        .btn-outline-warning:hover {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        .bulk-action-bar {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          border: 2px solid #3db5e6;
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.2);
        }

        .bulk-action-text {
          font-weight: 600;
          color: #0f3a4a;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 58, 74, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 540px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(15, 58, 74, 0.35);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
          padding: 24px;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-radius: 20px 20px 0 0;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #0f3a4a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .modal-close {
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #64748b;
          font-size: 18px;
        }

        .modal-close:hover {
          background: #e0f2fe;
          color: #0f3a4a;
          transform: rotate(90deg);
        }

        .modal-body {
          padding: 24px;
        }

        .modal-footer {
          padding: 20px 24px;
          border-top: 2px solid #e2e8f0;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-radius: 0 0 20px 20px;
        }

        .student-info-card {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          border-left: 4px solid #3db5e6;
        }

        .fee-details {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          border: 1px solid #bae6fd;
        }

        .fee-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #bae6fd;
        }

        .fee-row:last-child {
          border-bottom: none;
        }

        .fee-label {
          color: #64748b;
          font-size: 14px;
          font-weight: 600;
        }

        .fee-value {
          font-weight: 700;
          color: #0f3a4a;
          font-size: 15px;
        }

        .text-success {
          color: #059669 !important;
        }

        .text-danger {
          color: #ef4444 !important;
        }

        .text-muted {
          color: #94a3b8 !important;
        }

        .fw-bold {
          font-weight: 700 !important;
        }

        .promoted-by-info {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          border-left: 4px solid #3db5e6;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }

        .info-label {
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
        }

        .info-value {
          font-weight: 700;
          color: #3db5e6;
          font-size: 14px;
        }

        /* Decision Card Styles */
        .decision-grid {
          margin-top: 20px;
        }

        .decision-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(15, 58, 74, 0.06);
        }

        .decision-card.atkt-card {
          border-left: 4px solid #f59e0b;
        }

        .decision-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid #e2e8f0;
        }

        .decision-card-header h5 {
          font-size: 14px;
          font-weight: 700;
        }

        .decision-card-body {
          padding: 16px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 8px 0;
        }

        .detail-label {
          font-weight: 600;
          color: #64748b;
          font-size: 13px;
          min-width: 140px;
        }

        .detail-value {
          color: #0f3a4a;
          font-size: 13px;
          text-align: right;
          word-break: break-word;
        }

        .detail-value.fw-bold {
          font-weight: 700;
        }

        .snapshot-content .detail-row {
          border-bottom: 1px solid #f1f5f9;
        }

        .snapshot-content .detail-row:last-child {
          border-bottom: none;
        }

        .backlog-card {
          border-left: 4px solid #3db5e6;
        }

        .backlog-table {
          font-size: 13px;
        }

        .backlog-table thead th {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
          color: white;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .backlog-table tbody td {
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .backlog-filter .btn {
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
        }

        .attempt-table {
          font-size: 13px;
        }

        .attempt-table thead th {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
          color: white;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .attempt-table tbody td {
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .backlog-create-attempt .btn {
          padding: 8px 18px;
          font-size: 14px;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .decision-grid {
            grid-template-columns: 1fr !important;
          }
          
          .detail-row {
            flex-direction: column;
            gap: 4px;
          }
          
          .detail-label {
            min-width: auto;
          }
          
          .detail-value {
            text-align: left;
          }

          .backlog-table thead {
            display: none;
          }

          .backlog-table,
          .backlog-table tbody,
          .backlog-table tr,
          .backlog-table td {
            display: block;
            width: 100%;
          }

          .backlog-table tbody tr {
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
            background: #f8fafc;
          }

          .backlog-table tbody td {
            border-bottom: none;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
          }

          .backlog-table tbody td:last-child {
            border-bottom: none;
          }

          .backlog-filter {
            width: 100%;
          }

          .backlog-filter .filter-group {
            width: 100%;
            justify-content: center;
          }

          .backlog-filter .btn {
            flex: 1 1 auto;
          }

          .attempt-table thead {
            display: none;
          }

          .attempt-table,
          .attempt-table tbody,
          .attempt-table tr,
          .attempt-table td {
            display: block;
            width: 100%;
          }

          .attempt-table tbody tr {
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
            background: #f8fafc;
          }

          .attempt-table tbody td {
            border-bottom: none;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
          }

          .attempt-table tbody td:last-child {
            border-bottom: none;
          }
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          margin-bottom: 10px;
          font-weight: 600;
          color: #334155;
          font-size: 14px;
        }

        .form-control {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          resize: vertical;
          transition: all 0.3s ease;
        }

        .form-control:focus {
          border-color: #3db5e6;
          outline: none;
          box-shadow: 0 0 0 4px rgba(61, 181, 230, 0.1);
        }

        .alert {
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .alert-success {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
          border-left: 4px solid #059669;
        }

        .alert-danger {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
          border-left: 4px solid #ef4444;
        }

        .alert-warning {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
          border: 1px solid #fcd34d;
        }

        .alert-info {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          color: #0c4a6e;
          border-left: 4px solid #3db5e6;
        }

        .alert-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }

        .custom-checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-weight: 600;
          color: #92400e;
        }

        .loading-container {
          text-align: center;
          padding: 60px 20px;
        }

        .spinner-icon {
          font-size: 48px;
          animation: spin 1s linear infinite;
          color: #3db5e6;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
        }

        .empty-icon {
          font-size: 80px;
          color: #cbd5e1;
          margin-bottom: 20px;
        }

        .empty-title {
          font-size: 20px;
          font-weight: 700;
          color: #0f3a4a;
          margin-bottom: 8px;
        }

        .empty-text {
          color: #64748b;
          font-size: 15px;
        }

        .custom-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #3db5e6;
        }

        .fee-amount {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        .rupee-icon {
          font-size: 14px;
          color: #64748b;
        }

        .card-footer {
          padding: 20px 24px;
          border-top: 2px solid #e2e8f0;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          gap: 16px;
        }

        .pagination-info {
          font-size: 14px;
          color: #64748b;
          font-weight: 600;
        }

        .d-flex {
          display: flex;
        }

        .gap-2 {
          gap: 8px;
        }

        .ms-2 {
          margin-left: 8px;
        }

        .mt-1 {
          margin-top: 4px;
        }

        .text-center {
          text-align: center;
        }

        .mx-2 {
          margin-left: 8px;
          margin-right: 8px;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
            text-align: center;
            padding: 24px 20px;
          }

          .page-title {
            font-size: 24px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            padding: 20px;
          }

          .stat-icon {
            width: 52px;
            height: 52px;
            font-size: 24px;
          }

          .stat-value {
            font-size: 28px;
          }

          .filter-bar {
            flex-direction: column;
            padding: 16px;
          }

          .search-box {
            min-width: 100%;
          }

          .filter-group {
            width: 100%;
            flex-direction: column;
          }

          .filter-select,
          .btn-outline-secondary {
            width: 100%;
          }

          .card-footer {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .modal-content {
            max-width: 95vw;
            margin: 20px;
          }

          .data-table thead th,
          .data-table tbody td {
            padding: 14px 12px;
            font-size: 11px;
          }

          .btn-sm {
            padding: 6px 12px;
            font-size: 12px;
          }

          .bulk-action-bar {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
        }

@media (max-width: 480px) {
           .page-container {
             padding: 16px;
           }

           .page-header {
             padding: 20px 16px;
           }

           .page-title {
             font-size: 20px;
           }

           .header-icon {
             font-size: 28px;
           }

           .stats-grid {
             gap: 16px;
           }

           .stat-card {
             gap: 16px;
           }

           .stat-label {
             font-size: 12px;
           }

           .stat-value {
             font-size: 24px;
           }

           .card-header {
             padding: 16px 18px;
           }

           .card-body {
             padding: 16px;
           }

           .modal-header,
           .modal-body,
           .modal-footer {
             padding: 18px 16px;
           }

           .bulk-result-summary {
             flex-direction: column;
             gap: 12px;
           }

           .bulk-result-failed-title {
             font-size: 14px;
           }
         }

         .bulk-result-summary {
           display: flex;
           gap: 24px;
           justify-content: center;
           align-items: center;
           padding: 20px;
           background: #f8fafc;
           border-radius: 12px;
           margin-bottom: 20px;
         }

         .bulk-result-stat {
           display: flex;
           flex-direction: column;
           align-items: center;
           gap: 4px;
         }

         .bulk-result-count {
           font-size: 2rem;
           font-weight: 700;
           line-height: 1;
         }

         .bulk-result-label {
           font-size: 0.85rem;
           color: #64748b;
           font-weight: 500;
         }

         .bulk-result-failed {
           margin-top: 16px;
         }

         .bulk-result-failed-title {
           font-size: 16px;
           font-weight: 600;
           color: #1e293b;
           margin-bottom: 12px;
           display: flex;
           align-items: center;
           gap: 8px;
         }

         .bulk-result-failed .data-table {
           font-size: 13px;
         }

         .bulk-result-failed .data-table thead th {
           background: #f1f5f9;
           color: #475569;
           font-weight: 600;
           font-size: 12px;
           text-transform: uppercase;
           letter-spacing: 0.5px;
         }

         .bulk-result-failed .data-table tbody tr:hover {
           background: #f8fafc;
         }

.bulk-result-failed .text-danger {
            color: #dc2626 !important;
            font-weight: 500;
          }

          .bulk-reason-list {
            margin: 0;
            padding-left: 18px;
            list-style-type: disc;
          }

          .bulk-reason-list li {
            margin-bottom: 2px;
            font-size: 12px;
            line-height: 1.5;
          }

          /* Policy Snapshot Styles */
          .policy-snapshot-card {
            border-left: 4px solid #9C27B0;
          }

          .policy-snapshot-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
          }

          .policy-snapshot-item {
            display: flex;
            gap: 12px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            transition: all 0.2s ease;
          }

          .policy-snapshot-item:hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }

          .policy-icon {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .policy-icon.attendance {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            color: #1d4ed8;
          }

          .policy-icon.kt {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            color: #b45309;
          }

          .policy-icon.semester {
            background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
            color: #be185d;
          }

          .policy-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
            min-width: 0;
          }

          .policy-label {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .policy-value {
            font-size: 15px;
            font-weight: 600;
            color: #0f3a4a;
          }

          .policy-desc {
            font-size: 11px;
            color: #94a3b8;
          }

          .semester-chip {
            display: inline-block;
            background: #e0e7ff;
            color: #3730a3;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            margin-right: 6px;
            margin-bottom: 4px;
          }

          @media (max-width: 575.98px) {
            .policy-snapshot-grid {
              grid-template-columns: 1fr;
            }
            
            .policy-snapshot-item {
              padding: 12px;
            }
            
            .policy-icon {
              width: 38px;
              height: 38px;
            }
          }

          /* Attendance Snapshot Styles */
          .attendance-snapshot-card {
            border-left: 4px solid #3db5e6;
          }

          .attendance-progress-section {
            margin-bottom: 20px;
          }

          .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .progress-label {
            font-size: 13px;
            font-weight: 600;
            color: #0f3a4a;
          }

          .progress-value {
            font-size: 16px;
            font-weight: 700;
            color: #0f3a4a;
          }

          .progress-bar-container {
            height: 12px;
            background: #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 8px;
          }

          .progress-bar-fill {
            height: 100%;
            border-radius: 6px;
            transition: width 0.5s ease, background 0.3s ease;
          }

          .progress-markers {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #64748b;
          }

          .progress-markers .marker.required {
            font-weight: 600;
            color: #3db5e6;
          }

          .attendance-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }

          .detail-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .detail-label {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .detail-value {
            font-size: 14px;
            font-weight: 500;
            color: #0f3a4a;
          }

          .detail-value.override-yes {
            color: #f59e0b;
            font-weight: 600;
          }

          .detail-value.override-no {
            color: #94a3b8;
          }

          .detail-item.override-reason {
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
          }

          .attendance-status-message {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 14px 16px;
            border-radius: 8px;
            font-size: 13px;
            line-height: 1.5;
          }

          .attendance-status-message.passed {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
          }

          .attendance-status-message.failed {
            background: #fef2f2;
            color: #991b1b;
            border: 1px solid #fecaca;
          }

          .override-notice {
            margin-top: 10px;
            padding: 10px 12px;
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 6px;
            color: #92400e;
            font-size: 12px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
          }

          @media (max-width: 575.98px) {
            .attendance-details-grid {
              grid-template-columns: 1fr;
            }
          }

          /* Fee Snapshot Styles */
          .fee-snapshot-card {
            border-left: 4px solid #059669;
          }

          .fee-progress-section {
            margin-bottom: 20px;
          }

          .fee-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }

          .fee-details-grid .detail-item.highlight {
            background: white;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            text-align: center;
          }

          .fee-details-grid .detail-item.highlight .detail-label {
            font-size: 10px;
            color: #94a3b8;
          }

          .fee-details-grid .detail-item.highlight .detail-value {
            font-size: 16px;
            font-weight: 700;
          }

          .detail-value.paid-amount {
            color: #059669;
          }

          .detail-value.pending-amount {
            color: #dc2626;
          }

          .detail-value.clearance-yes {
            color: #f59e0b;
            font-weight: 600;
          }

          .detail-value.clearance-no {
            color: #059669;
            font-weight: 600;
          }

          .fee-status-message {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 14px 16px;
            border-radius: 8px;
            font-size: 13px;
            line-height: 1.5;
          }

          .fee-status-message.passed {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
          }

          .fee-status-message.failed {
            background: #fef2f2;
            color: #991b1b;
            border: 1px solid #fecaca;
          }

          @media (max-width: 575.98px) {
            .fee-details-grid {
              grid-template-columns: 1fr;
            }
            
            .fee-details-grid .detail-item.highlight {
              text-align: left;
            }
          }

          /* Backlog Details Styles */
          .backlog-card {
            border-left: 4px solid #3db5e6;
          }

          .backlog-summary {
            white-space: nowrap;
          }

          .filter-count {
            background: rgba(255,255,255,0.3);
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            margin-left: 6px;
          }

          .btn-primary .filter-count {
            background: rgba(255,255,255,0.3);
          }

          .badge-sm {
            font-size: 11px;
            padding: 4px 8px;
          }

          .backlog-subject {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .subject-name {
            font-weight: 600;
            color: #0f3a4a;
            font-size: 13px;
          }

          .subject-code {
            font-size: 11px;
            color: #64748b;
            background: #f1f5f9;
            padding: 2px 8px;
            border-radius: 4px;
            display: inline-block;
            width: fit-content;
          }

          .subject-type {
            font-size: 11px;
            color: #3db5e6;
            background: #e0f2fe;
            padding: 2px 8px;
            border-radius: 4px;
            display: inline-block;
            width: fit-content;
            font-weight: 500;
            text-transform: uppercase;
          }

          .attempt-count {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            background: #f1f5f9;
            font-weight: 600;
            font-size: 13px;
            color: #0f3a4a;
          }

          .view-attempts-btn {
            white-space: nowrap;
          }

          .backlog-row:hover {
            background: #f8fafc;
          }

          .backlog-empty-state {
            background: #f8fafc;
            border-radius: 12px;
            border: 2px dashed #e2e8f0;
          }

          .empty-icon-wrapper {
            width: 100px;
            height: 100px;
            margin: 0 auto;
            border-radius: 50%;
            background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          @media (max-width: 767.98px) {
            .backlog-table th,
            .backlog-table td {
              padding: 8px 6px;
              font-size: 12px;
            }
            
            .subject-name {
              font-size: 12px;
            }
            
            .subject-code,
            .subject-type {
              font-size: 10px;
              padding: 1px 6px;
            }
            
            .attempt-count {
              width: 24px;
              height: 24px;
              font-size: 12px;
            }
            
            .view-attempts-btn {
              padding: 4px 8px;
              font-size: 11px;
            }
          }

          /* Outcome Banner Styles - Improved */
          .outcome-banner {
            border-radius: 14px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            border: none;
            overflow: hidden;
          }

          .outcome-banner-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            flex-wrap: wrap;
            padding: 20px 24px;
          }

          .outcome-icon {
            font-size: 40px;
            flex-shrink: 0;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          }

          .outcome-text {
            flex: 1;
            min-width: 200px;
          }

          .outcome-label {
            font-size: 22px;
            font-weight: 700;
            text-transform: none;
            letter-spacing: -0.5px;
            line-height: 1.3;
          }

          .outcome-reason {
            margin-top: 8px;
            font-size: 14px;
            opacity: 0.95;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }

          .workflow-badge {
            background: rgba(255,255,255,0.25);
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: capitalize;
          }

          .outcome-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            flex-shrink: 0;
          }

          .outcome-actions .btn {
            font-size: 12px;
            padding: 8px 14px;
            border-radius: 8px;
            font-weight: 600;
            backdrop-filter: blur(10px);
            transition: all 0.2s ease;
          }

          .outcome-actions .btn-outline-light {
            border: 2px solid rgba(255,255,255,0.5);
            color: white;
            background: rgba(255,255,255,0.1);
          }

          .outcome-actions .btn-outline-light:hover {
            background: rgba(255,255,255,0.25);
            border-color: rgba(255,255,255,0.8);
          }

          .outcome-actions .btn-light {
            background: white;
            color: inherit;
            border: none;
          }

          .outcome-actions .btn-light:hover {
            background: rgba(255,255,255,0.9);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }

          @media (max-width: 767.98px) {
            .outcome-banner-content {
              flex-direction: column;
              align-items: flex-start;
              padding: 16px 20px;
              gap: 16px;
            }
            
            .outcome-icon {
              font-size: 32px;
            }
            
            .outcome-label {
              font-size: 18px;
            }
            
            .outcome-reason {
              font-size: 13px;
              gap: 8px;
            }
            
            .outcome-actions {
              width: 100%;
              justify-content: flex-start;
            }
            
            .outcome-actions .btn {
              flex: 1;
              min-width: 120px;
              justify-content: center;
            }
          }
        `}</style>
    </div>
  );
}
