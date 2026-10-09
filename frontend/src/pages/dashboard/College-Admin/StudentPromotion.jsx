import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthContext } from "../../../auth/AuthContext";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import StandardListView from "../../../components/StandardListView/StandardListView";
import {
  getPromotionEligibleStudents,
  bulkPromoteStudents,
  getCollegePromotionHistory,
  getPromotionEligibility,
  getStudentBacklogs,
  getBacklogAttempts,
  evaluateBacklogAttempt,
  executePromotionDecision,
} from "../../../api/promotion";
import { moveToAlumni, getAlumniEligibility } from "../../../api/alumni";
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
  FaTimes,
  FaSyncAlt,
  FaSpinner,
  FaHistory,
  FaDollarSign,
  FaUsers,
  FaFilter,
  FaClipboardCheck,
  FaEye,
  FaFileAlt,
  FaInfoCircle,
  FaExclamationCircle,
  FaArrowRight,
  FaRupeeSign,
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

/**
 * Helper function to get academic year label based on semester and optional year
 * Returns: 1st Year, 2nd Year, 3rd Year, 4th Year, etc.
 */
function getAcademicYearLabel(semester, year) {
  const y = year || Math.ceil(Number(semester || 1) / 2);
  return `${y}${getOrdinalSuffix(y)} Year`;
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

/**
 * Centralized, College Admin-friendly label maps.
 * Backend enum/code values are never rendered directly - everything goes
 * through these maps so the wording stays consistent across the modal.
 */
const DECISION_REASON_LABELS = {
  ELIGIBLE: "Eligible under the promotion policy",
  PASS: "All subjects passed and promotion criteria met",
  ATKT: "Eligible for promotion with failed subjects within the allowed limit",
  INCOMPLETE: "Result is Incomplete",
  NO_RESULT: "Result Not Available",
  AMBIGUOUS_RESULT: "Multiple Published Results Found",
  RESULT_INCOMPLETE: "Result is Incomplete",
  FAIL: "Student has failed and is not eligible for promotion",
  BLOCKED: "Promotion Blocked",
  KT_LIMIT_EXCEEDED: "Maximum Allowed Failed Subjects Exceeded",
  ATTENDANCE_INSUFFICIENT: "Attendance Requirement Not Met",
  ATTENDANCE_NOT_AVAILABLE: "Attendance Data Not Available",
  FEE_NOT_CLEARED: "Minimum Fee Payment Requirement Not Met",
  PREVIOUS_YEAR_BACKLOG_NOT_CLEARED: "Previous Year Backlog Requirement Not Met",
};

const ATTENDANCE_STATUS_LABELS = {
  ELIGIBLE: "Requirement Met",
  NOT_ELIGIBLE: "Requirement Not Met",
  ATTENDANCE_NOT_AVAILABLE: "Attendance Data Not Available",
};

const FEE_STATUS_LABELS = {
  FULLY_PAID: "Requirement Met",
  PARTIALLY_PAID: "Requirement Not Met",
  PENDING: "Requirement Not Met",
};

const ERROR_CODE_LABELS = {
  NO_RESULT: "Result Not Available",
  AMBIGUOUS_RESULT: "Multiple Published Results Found",
  INCOMPLETE: "Result is Incomplete",
  RESULT_INCOMPLETE: "Result is Incomplete",
  KT_LIMIT_EXCEEDED: "Maximum Allowed Failed Subjects Exceeded",
  ATTENDANCE_INSUFFICIENT: "Attendance Requirement Not Met",
  ATTENDANCE_NOT_AVAILABLE: "Attendance Data Not Available",
  FEE_NOT_CLEARED: "Minimum Fee Payment Requirement Not Met",
  STUDENT_NOT_FOUND: "Student Not Found",
};

/**
 * Format an API error code for display without leaking backend codes
 */
function formatErrorCode(code) {
  if (!code) return "";
  return ERROR_CODE_LABELS[code] || String(code).replace(/_/g, " ");
}

/**
 * Format a boolean for display so values are never left blank
 */
function formatBooleanLabel(value, { applied = false, notApplied = null } = {}) {
  if (value === true) return applied;
  if (value === false) return notApplied ?? "Not Applied";
  return notApplied ?? "Not Applied";
}

/**
 * Round a percentage to a whole number so values like 90.90909... display as 91%
 */
function roundPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

/**
 * Format a percentage for display (whole number only)
 */
function formatPercent(value) {
  return `${roundPercent(value)}%`;
}

/**
 * Compact status row component for eligibility checks
 * Shows: ✓ Specific message  |  ✗ Short reason with key value
 */
function renderCompactStatus({ label, passed, value, reason, message }) {
  return (
    <div key={label} className="compact-status-row" style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "10px", 
      padding: "10px 12px",
      background: passed ? "#f0fdf4" : "#fef2f2",
      border: passed ? "1px solid #bbf7d0" : "1px solid #fecaca",
      borderRadius: "8px",
      marginBottom: "8px",
    }}>
      <span style={{ 
        fontSize: "18px", 
        color: passed ? "#059669" : "#dc2626",
        flexShrink: 0,
      }}>
        {passed ? "✓" : "✗"}
      </span>
      <span style={{ 
        fontWeight: 600, 
        color: "#374151",
        minWidth: "140px",
        fontSize: "13px",
      }}>
        {label}
      </span>
      <span style={{ 
        color: passed ? "#166534" : "#991b1b",
        fontSize: "13px",
        flex: 1,
      }}>
        {passed 
          ? (message || "Requirement met")
          : (reason || "Requirement not met")
        }
        {value && !passed && (
          <span style={{ 
            marginLeft: "8px", 
            fontWeight: 500,
            background: "rgba(0,0,0,0.05)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "12px",
          }}>
            {value}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * Get compact status for Result/KT check
 */
export function getResultStatus(data) {
  if (!data) return null;
  const resultStatus = data.result_status;
  const outcome = data.promotion_outcome;
  const ktCount = data.kt_count ?? 0;
  const maxKt = data.policy_snapshot?.resolvedMaxAllowedKTs ?? data.policy_snapshot?.maxAllowedKTs;
  const reason = data.decision_reason;
  
  // 1. Missing, incomplete, or ambiguous results
  if (resultStatus === "NO_RESULT" || outcome === "NO_RESULT") {
    return { label: "Result", passed: false, reason: "No published semester result available" };
  }
  if (resultStatus === "INCOMPLETE" || outcome === "INCOMPLETE" || outcome === "RESULT_INCOMPLETE") {
    return { label: "Result", passed: false, reason: "Semester result contains incomplete marks" };
  }
  if (resultStatus === "AMBIGUOUS_RESULT" || outcome === "AMBIGUOUS_RESULT") {
    return { label: "Result", passed: false, reason: "Multiple published results found" };
  }
  
  // 2. Clear pass (either outcome is PASS or published result with 0 KTs/failed subjects)
  if (outcome === "PASS" || (resultStatus === "PUBLISHED" && ktCount === 0)) {
    return { label: "Result", passed: true, message: "Result is clear" };
  }
  
  // 3. FAIL / BLOCKED with KT limit exceeded
  if (reason === "KT_LIMIT_EXCEEDED" || outcome === "FAIL") {
    const value = maxKt !== undefined && maxKt !== null
      ? `${ktCount} KT — Allowed: ${maxKt}`
      : `${ktCount} KT found`;
    return { label: "KT", passed: false, value, reason: "KT limit exceeded" };
  }
  
  // 4. ATKT - failed subjects within limit
  if (outcome === "ATKT" || (resultStatus === "PUBLISHED" && ktCount > 0)) {
    const value = maxKt !== undefined && maxKt !== null 
      ? `${ktCount} KT — Allowed: ${maxKt}`
      : `${ktCount} KT found`;
    return { label: "KT", passed: true, message: value };
  }
  
  return { label: "Result", passed: false, reason: "Result not evaluable" };
}

/**
 * Get compact status for Attendance check
 */
export function getAttendanceStatus(data) {
  if (!data || !data.attendance_snapshot) return null;
  const snap = data.attendance_snapshot;
  const percentage = roundPercent(snap.percentage);
  const required = roundPercent(snap.requiredPercentage ?? 75);
  const passed = snap.passed === true;
  const status = snap.status || (passed ? "ELIGIBLE" : "NOT_ELIGIBLE");
  
  if (required === 0) {
    return { 
      label: "Attendance", 
      passed: true, 
      value: "Not required",
      message: "No attendance requirement (0% required)" 
    };
  }

  if (status === "ATTENDANCE_NOT_AVAILABLE") {
    return { 
      label: "Attendance", 
      passed: false, 
      value: "Data not available",
      reason: `Attendance data not available — ${required}% required` 
    };
  }
  
  const value = `${percentage}% — Required: ${required}%`;
  
  if (passed) {
    return { label: "Attendance", passed: true, message: value };
  }
  
  return { 
    label: "Attendance", 
    passed: false, 
    value, 
    reason: `Attendance below ${required}%` 
  };
}

/**
 * Get compact status for Fee check
 */
function getFeeStatus(data) {
  if (!data || !data.fee_clearance_snapshot) return null;
  const snap = data.fee_clearance_snapshot;
  const totalFee = snap.totalFee ?? 0;
  const paidAmount = snap.paidAmount ?? 0;
  const paidPercentage = roundPercent(
    snap.paidPercentage ?? (totalFee > 0 ? Math.round((paidAmount / totalFee) * 100) : 0)
  );
  const requiredPercentage = roundPercent(snap.requiredPaidPercentage ?? 100);
  const passed = snap.passed === true;
  
  const value = `Paid ${paidPercentage}% — Required: ${requiredPercentage}%`;
  
  if (passed) {
    return { label: "Fee", passed: true, message: value };
  }
  
  return { 
    label: "Fee", 
    passed: false, 
    value, 
    reason: `Fee payment below ${requiredPercentage}%` 
  };
}

/**
 * Get compact status for Previous Year Backlog check
 */
function getBacklogStatus(data, backlogs = []) {
  if (!data || !data.policy_snapshot) return null;
  const policy = data.policy_snapshot;
  const required = policy.previousYearClearanceRequired === true;
  const passed = policy.previousYearClearancePassed === true;
  
  if (!required) {
    return { label: "Previous Backlog", passed: true, message: "Not required" };
  }
  
  if (passed) {
    return { label: "Previous Backlog", passed: true, message: "Cleared (No pending backlog)" };
  }

  // Inspect student's authoritative backlogs to provide the precise status
  const activeBacklogs = (backlogs || []).filter(
    (b) => b.status !== "CLEARED" && b.status !== "CANCELLED"
  );
  const hasAttempted = activeBacklogs.some(
    (b) => b.status === "ATTEMPTED" || b.latest_result_status === "INCOMPLETE"
  );
  const hasFailed = activeBacklogs.some(
    (b) => b.latest_result_status === "FAIL"
  );

  if (hasAttempted) {
    return {
      label: "Previous Backlog",
      passed: false,
      value: "Attempted / Pending",
      reason: "Attempt in progress — evaluation pending",
    };
  }

  if (hasFailed) {
    return {
      label: "Previous Backlog",
      passed: false,
      value: "Not cleared (Failed)",
      reason: "Previous backlog attempt failed",
    };
  }
  
  return { 
    label: "Previous Backlog", 
    passed: false, 
    value: "Not cleared", 
    reason: "Previous backlog not cleared" 
  };
}

/**
 * Get compact status for Promotion Rules
 */
function getPolicyStatus(data) {
  if (!data || !data.policy_snapshot) return null;
  const policy = data.policy_snapshot;
  const parts = [];
  
  if (policy.minAttendancePercentage !== undefined && policy.minAttendancePercentage !== null) {
    parts.push(`Attendance: ${formatPercent(policy.minAttendancePercentage)}`);
  }
  if (policy.maxAllowedKTs !== undefined && policy.maxAllowedKTs !== null) {
    parts.push(`Max KT: ${policy.maxAllowedKTs}`);
  }
  if (policy.minimumFeePaidPercentage !== undefined && policy.minimumFeePaidPercentage !== null) {
    parts.push(`Min Fee: ${formatPercent(policy.minimumFeePaidPercentage)}`);
  }
  if (policy.previousYearClearanceRequired === true) {
    parts.push("Prev. Backlog: Required");
  }
  
  const value = parts.length > 0 ? parts.join(" | ") : "Default rules";
  
  return { label: "Rules", passed: true, message: "Promotion rules satisfied" };
}

/**
 * Backlog history empty-state copy.
 *
 * Having zero backlog records only means the BACKLOG requirement is
 * satisfied - it never means the student is eligible for promotion.
 * Overall promotion status comes from the eligibility decision shown above.
 *
 * @param {string} outcome - promotion_outcome from the eligibility decision
 * @param {number} [currentSemester] - student's current semester (1-based)
 * @returns {{title: string, message: string}}
 */
function getBacklogEmptyState(outcome, currentSemester) {
  const isSemesterOne = currentSemester === 1;

  if (isSemesterOne) {
    return {
      title: "No Previous Backlogs",
      message: "This is Semester 1, so there are no previous-semester backlog records.",
    };
  }

  if (outcome === "BLOCKED") {
    return {
      title: "No Previous Backlogs",
      message: "However, promotion may still be blocked by another eligibility requirement. Please refer to the promotion decision above.",
    };
  }

  return {
    title: "No Previous Backlogs",
    message: "The student has no pending backlogs from previous semesters.",
  };
}

/**
 * Format promotion decision reason for display
 */
function formatDecisionReason(reason) {
  if (!reason) return "-";
  return (
    DECISION_REASON_LABELS[reason] ||
    String(reason)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  );
}

/**
 * Build a full, meaningful decision reason for the College Admin.
 * Where the underlying snapshots carry real numbers, the message includes them
 * so the admin sees exactly why the decision was made.
 */
function getDecisionReasonMessage(data) {
  if (!data) return "-";
  const reason = data.decision_reason;
  const outcome = data.promotion_outcome;

  if (!reason) {
    if (outcome === "ATKT") return DECISION_REASON_LABELS.ATKT;
    if (outcome === "PASS") return DECISION_REASON_LABELS.PASS;
    return "-";
  }

  const attendance = data.attendance_snapshot;
  const fee = data.fee_clearance_snapshot;

  if (reason === "ELIGIBLE") {
    if (outcome === "ATKT") {
      const kt = data.kt_count ?? 0;
      const maxKt = data.policy_snapshot?.maxAllowedKTs;
      return maxKt !== undefined && maxKt !== null
        ? `Eligible under the ATKT policy. The student has ${kt} failed subject${kt === 1 ? "" : "s"}, which is within the limit of ${maxKt}.`
        : `Eligible under the ATKT policy. The student has ${kt} failed subject${kt === 1 ? "" : "s"}.`;
    }
    return `${DECISION_REASON_LABELS.ELIGIBLE}. All attendance, fee and subject requirements have been met.`;
  }

  if (reason === "ATTENDANCE_INSUFFICIENT" && attendance) {
    const percentage = roundPercent(attendance.percentage);
    const required = roundPercent(attendance.requiredPercentage);
    return `${DECISION_REASON_LABELS.ATTENDANCE_INSUFFICIENT}. The student has ${percentage}% attendance, but ${required}% is required for promotion.`;
  }

  if (reason === "FEE_NOT_CLEARED" && fee) {
    const paidPercent = roundPercent(fee.paidPercentage);
    const requiredPercent = roundPercent(fee.requiredPaidPercentage ?? 100);
    return `${DECISION_REASON_LABELS.FEE_NOT_CLEARED}. The student has paid ${paidPercent}%, but ${requiredPercent}% is required for promotion.`;
  }

  if (reason === "KT_LIMIT_EXCEEDED") {
    const kt = data.kt_count ?? 0;
    const maxKt = data.policy_snapshot?.maxAllowedKTs;
    return maxKt !== undefined && maxKt !== null
      ? `${DECISION_REASON_LABELS.KT_LIMIT_EXCEEDED}. The student has ${kt} failed subjects, but only ${maxKt} are allowed.`
      : DECISION_REASON_LABELS.KT_LIMIT_EXCEEDED;
  }

  return formatDecisionReason(reason);
}

/**
 * Get compact reason for outcome banner
 * Short, scannable reason for the promotion decision
 */
function getCompactReasonMessage(data) {
  if (!data) return "";
  const outcome = data.promotion_outcome;
  const reason = data.decision_reason;
  const kt = data.kt_count ?? 0;
  const maxKt = data.policy_snapshot?.maxAllowedKTs;
  const attendance = data.attendance_snapshot;
  const fee = data.fee_clearance_snapshot;

  // ATKT - short reason
  if (outcome === "ATKT") {
    return maxKt !== undefined && maxKt !== null
      ? `${kt} failed subject${kt === 1 ? "" : "s"} — allowed limit: ${maxKt}.`
      : `${kt} failed subject${kt === 1 ? "" : "s"}.`;
  }

  // PASS - short reason
  if (outcome === "PASS") {
    return "All requirements satisfied.";
  }

  // Blocked states - short reasons
  if (reason === "KT_LIMIT_EXCEEDED") {
    return maxKt !== undefined && maxKt !== null
      ? `${kt} failed subject${kt === 1 ? "" : "s"} — allowed limit: ${maxKt}.`
      : "KT limit exceeded.";
  }

  if (reason === "ATTENDANCE_INSUFFICIENT" && attendance) {
    const percentage = roundPercent(attendance.percentage);
    const required = roundPercent(attendance.requiredPercentage);
    return `Attendance ${percentage}% — required ${required}%.`;
  }

  if (reason === "FEE_NOT_CLEARED" && fee) {
    const paidPercent = roundPercent(fee.paidPercentage);
    const requiredPercent = roundPercent(fee.requiredPaidPercentage ?? 100);
    return `Fee paid ${paidPercent}% — required ${requiredPercent}%.`;
  }

  if (reason === "PREVIOUS_YEAR_BACKLOG_NOT_CLEARED") {
    return "Previous backlog not cleared.";
  }

  if (outcome === "NO_RESULT") return "No published semester result available.";
  if (outcome === "INCOMPLETE" || outcome === "RESULT_INCOMPLETE") return "Semester result contains incomplete marks.";
  if (outcome === "AMBIGUOUS_RESULT") return "Multiple published results found.";

  return formatDecisionReason(reason);
}

/**
 * Evaluate Alumni Eligibility & collect exact blockers from eligibility decision data.
 * Used for students in their final semester.
 */
function getAlumniEligibilityInfo(data) {
  if (!data) return { isEligible: false, blockers: [] };

  const blockers = [];
  const resultStatus = data.result_status;
  const outcome = data.promotion_outcome;
  const decisionReason = data.decision_reason;
  const attendanceSnap = data.attendance_snapshot;
  const feeSnap = data.fee_clearance_snapshot;
  const policySnap = data.policy_snapshot;

  // PromotionDecision.result_status API contract uses "PUBLISHED", "NO_RESULT", or "AMBIGUOUS_RESULT".
  // "FOUND" is accepted for backward/internal compatibility with resultAuthority service.
  const isResultPublished = resultStatus === "PUBLISHED" || resultStatus === "FOUND";

  // 1. Result Check
  if (resultStatus === "AMBIGUOUS_RESULT" || outcome === "AMBIGUOUS_RESULT") {
    blockers.push("Multiple published results found; resolution required.");
  } else if (!isResultPublished || outcome === "NO_RESULT") {
    blockers.push("Final semester exam result has not been published.");
  } else if (outcome === "INCOMPLETE" || outcome === "RESULT_INCOMPLETE") {
    blockers.push("Final semester result contains incomplete marks.");
  } else if (
    outcome === "FAIL" ||
    decisionReason === "KT_LIMIT_EXCEEDED" ||
    (data.kt_count && data.kt_count > 0) ||
    outcome === "ATKT"
  ) {
    const kt = data.kt_count || (data.failed_subject_ids ? data.failed_subject_ids.length : 1);
    blockers.push(
      `All subjects must be cleared to graduate. Student has ${kt} uncleared subject${kt === 1 ? "" : "s"}.`
    );
  }

  // 2. Attendance Check
  if (attendanceSnap) {
    const req = roundPercent(attendanceSnap.requiredPercentage ?? 75);
    if (req > 0 && attendanceSnap.status === "ATTENDANCE_NOT_AVAILABLE") {
      blockers.push("Attendance data is not available for this semester.");
    } else if (attendanceSnap.passed === false) {
      const pct = roundPercent(attendanceSnap.percentage);
      blockers.push(`Attendance requirement not met (${pct}% / Required: ${req}%).`);
    }
  }

  // 3. Fee Clearance Check
  if (feeSnap) {
    if (feeSnap.passed === false) {
      const pending = Number(feeSnap.pendingAmount || 0);
      const paidPct = roundPercent(feeSnap.paidPercentage);
      const reqPct = roundPercent(feeSnap.requiredPaidPercentage ?? 100);
      blockers.push(
        pending > 0
          ? `Pending fee of ₹${pending.toLocaleString()} must be cleared.`
          : `Fee payment requirement not met (${paidPct}% paid / Required: ${reqPct}%).`
      );
    }
  }

  // 4. Backlog / Previous Year Check
  if (
    policySnap?.previousYearClearancePassed === false ||
    decisionReason === "PREVIOUS_YEAR_BACKLOG_NOT_CLEARED"
  ) {
    blockers.push("Previous-year backlogs must be cleared before graduation.");
  }

  if (blockers.length === 0 && outcome !== "PASS") {
    blockers.push(formatDecisionReason(decisionReason) || "Academic requirements for graduation not met.");
  }

  const isEligible = isResultPublished && outcome === "PASS" && blockers.length === 0;

  return { isEligible, blockers };
}

/**
 * Format promotion outcome for display
 */
function formatOutcome(outcome) {
  if (!outcome) return "Unknown";
  const outcomeMap = {
    PASS: "Pass",
    ATKT: "Eligible for Promotion with ATKT",
    FAIL: "Not Eligible for Promotion",
    INCOMPLETE: "Result is Incomplete",
    NO_RESULT: "Result Not Available",
    AMBIGUOUS_RESULT: "Multiple Published Results Found",
    BLOCKED: "Promotion Blocked",
  };
  return outcomeMap[outcome] || outcome;
}

/**
 * Get icon for promotion outcome
 */
function getOutcomeIcon(outcome) {
  const iconMap = {
    PASS: "✅",
    ATKT: "✅",
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
    ATKT: "Eligible for Promotion with ATKT",
    FAIL: "Not Eligible for Promotion",
    INCOMPLETE: "Result is Incomplete",
    NO_RESULT: "Result Not Available",
    AMBIGUOUS_RESULT: "Multiple Published Results Found",
    BLOCKED: "Promotion Currently Blocked",
  };
  return labelMap[outcome] || DECISION_REASON_LABELS[outcome] || outcome;
}

/**
 * Get banner style for promotion outcome
 */
function getOutcomeBannerStyle(outcome) {
  const styleMap = {
    PASS: { background: "linear-gradient(135deg, #059669 0%, #047857 100%)", color: "white" },
    ATKT: { background: "linear-gradient(135deg, #059669 0%, #047857 100%)", color: "white" },
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
    DRAFT: "Awaiting Recommendation",
    RECOMMENDED: "Recommended for Promotion",
    UNDER_REVIEW: "Under Review",
    APPROVED: "Approved - Ready to Promote",
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
  const [alumniEligibilityData, setAlumniEligibilityData] = useState(null);

  // Backlog Management State (read-only, Step 5)
  const [backlogs, setBacklogs] = useState([]);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [backlogError, setBacklogError] = useState(null);
  const [backlogStatusFilter, setBacklogStatusFilter] = useState("ALL");

  // Backlog Attempts State (attempt history view)
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const [selectedBacklog, setSelectedBacklog] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState(null);
  const [evaluatingAttemptId, setEvaluatingAttemptId] = useState(null);

  // Workflow action state
  const [actionLoading, setActionLoading] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);

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
      setAlumniEligibilityData(null);
      setEligibilityStudent({
        ...student,
        academicYearLabel:
          student.academicYearLabel ||
          getAcademicYearLabel(student.currentSemester, student.currentYear),
      });
      setShowEligibilityModal(true);

      const isFinal = Boolean(
        student?.isFinalYear ||
          (student?.currentSemester &&
            student?.course_id?.durationSemesters &&
            student.currentSemester >= student.course_id.durationSemesters)
      );

      const [promoRes, alumniRes] = await Promise.all([
        getPromotionEligibility(student._id),
        isFinal
          ? getAlumniEligibility(student._id).catch((err) => {
              logger.warn("Alumni eligibility error:", err.message);
              return null;
            })
          : Promise.resolve(null),
      ]);

      setEligibilityData(promoRes.data || promoRes);
      if (alumniRes) {
        setAlumniEligibilityData(alumniRes.data || alumniRes);
      }
      fetchBacklogs(student._id, "ALL");
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
      const isFinal = Boolean(
        eligibilityStudent?.isFinalYear ||
          (eligibilityStudent?.currentSemester &&
            eligibilityStudent?.course_id?.durationSemesters &&
            eligibilityStudent.currentSemester >= eligibilityStudent.course_id.durationSemesters)
      );

      const [promoRes, alumniRes] = await Promise.all([
        getPromotionEligibility(eligibilityStudent._id),
        isFinal
          ? getAlumniEligibility(eligibilityStudent._id).catch((err) => {
              logger.warn("Alumni eligibility refresh error:", err.message);
              return null;
            })
          : Promise.resolve(null),
      ]);

      setEligibilityData(promoRes.data || promoRes);
      if (alumniRes) {
        setAlumniEligibilityData(alumniRes.data || alumniRes);
      }
      fetchBacklogs(eligibilityStudent._id, "ALL");
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
    setShowAttemptsModal(true);
    fetchAttempts(backlog._id);
  };

  const closeAttemptsModal = () => {
    setShowAttemptsModal(false);
    setSelectedBacklog(null);
    setAttempts([]);
    setAttemptsError(null);
    setEvaluatingAttemptId(null);
  };

  /**
   * Evaluate an incomplete backlog attempt based on teacher marks.
   */
  const handleEvaluateAttempt = async (attemptId) => {
    if (!selectedBacklog?._id || !attemptId) return;
    setEvaluatingAttemptId(attemptId);
    try {
      const res = await evaluateBacklogAttempt(selectedBacklog._id, attemptId, {});
      const data = res?.data || res;
      const resultStatus = data?.resultStatus || data?.attempt?.result_status;
      const passed = data?.passed ?? data?.attempt?.passed;
      if (passed || resultStatus === "PASS") {
        toast.success("Backlog cleared successfully! (Result: PASS)");
      } else if (resultStatus === "FAIL") {
        toast.info("Backlog evaluated: FAIL (Backlog remains OPEN)");
      } else {
        toast.info("Backlog attempt is pending / incomplete");
      }
      await fetchAttempts(selectedBacklog._id);
      if (eligibilityStudent?._id) {
        await fetchBacklogs(eligibilityStudent._id, backlogStatusFilter);
        await refreshEligibility();
      }
    } catch (err) {
      const message = err.response?.data?.message || "Failed to evaluate backlog attempt.";
      logger.error("Error evaluating attempt:", err);
      toast.error(message);
    } finally {
      setEvaluatingAttemptId(null);
    }
  };

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

      if (
        (responseStatus === "PROMOTED" ||
          response?.executionStatus === "PROMOTED" ||
          response?.data?.executionStatus === "PROMOTED") &&
        eligibilityStudent
      ) {
        const updatedStudentData =
          response?.student ||
          response?.data?.student;

        const nextSemester =
          response?.newSemester ||
          response?.data?.newSemester ||
          updatedStudentData?.currentSemester ||
          ((eligibilityStudent?.currentSemester || 0) + 1);

        const nextYear =
          updatedStudentData?.currentYear ||
          Math.ceil(nextSemester / 2);

        const nextAcademicYear =
          updatedStudentData?.currentAcademicYear ||
          eligibilityStudent?.currentAcademicYear;

        const nextAcademicYearLabel =
          getAcademicYearLabel(nextSemester, nextYear);

        const synchronizedStudent = {
          ...eligibilityStudent,
          ...(updatedStudentData || {}),
          currentSemester: nextSemester,
          currentYear: nextYear,
          currentAcademicYear: nextAcademicYear,
          academicYearLabel: nextAcademicYearLabel,
        };

        setEligibilityStudent(synchronizedStudent);

        setStudents((prev) =>
          prev.map((s) =>
            s._id === synchronizedStudent._id
              ? { ...s, ...synchronizedStudent }
              : s
          )
        );

        fetchEligibleStudents();
        if (showHistory) {
          await fetchPromotionHistory();
        }
      }

      await refreshEligibility();
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

  /**
   * Whether the current decision can be directly confirmed and promoted.
   * True when outcome is PASS or ATKT AND the decision has not yet been promoted.
   */
  const isReviewableOutcome = (outcome) =>
    outcome === "PASS" || outcome === "ATKT";

  const isFinalSemester = Boolean(
    eligibilityStudent?.isFinalYear ||
      (eligibilityStudent?.currentSemester &&
        eligibilityStudent?.course_id?.durationSemesters &&
        eligibilityStudent.currentSemester >=
          eligibilityStudent.course_id.durationSemesters)
  );

  const workflowStatus = eligibilityData?.workflow_status;
  const showConfirmPromotion =
    !isFinalSemester &&
    eligibilityData &&
    isReviewableOutcome(eligibilityData.promotion_outcome) &&
    workflowStatus !== "PROMOTED";

  const alumniInfo = useMemo(() => {
    if (!isFinalSemester) return { isEligible: false, blockers: [] };

    // Prefer backend authoritative Alumni Eligibility response
    if (alumniEligibilityData) {
      const isEligible = alumniEligibilityData.eligible === true;
      const status = alumniEligibilityData.status;
      const rawBlockers = alumniEligibilityData.blockers || [];
      const blockers = rawBlockers.map((b) => (typeof b === "string" ? b : b.message));
      return {
        isEligible,
        status,
        message: alumniEligibilityData.message,
        blockers,
        checks: alumniEligibilityData.checks,
        policy: alumniEligibilityData.policy,
      };
    }

    if (eligibilityData) {
      return getAlumniEligibilityInfo(eligibilityData);
    }

    return { isEligible: false, blockers: [] };
  }, [isFinalSemester, alumniEligibilityData, eligibilityData]);

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
      setLoading(true);

      const res = await bulkPromoteStudents({
        studentIds: selectedStudents,
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

  const columns = [
  {
    key: "student",
    label: "Student",
    sortable: true,
    width: "260px",
    render: (student) => (
      <div>
        <div className="student-name">
          {student.fullName}
        </div>
        <div className="student-email">
          {student.email}
        </div>
      </div>
    ),
  },

  {
    key: "academicYear",
    label: "Academic Year",
    sortable: true,
    width: "160px",
    render: (student) => (
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
    ),
  },

  {
    key: "totalFee",
    label: "Total Fee",
    sortable: true,
    width: "140px",
    render: (student) => (
      <div className="fee-amount">
        <FaRupeeSign className="rupee-icon" />
        {student.fee?.totalFee || 0}
      </div>
    ),
  },

  {
    key: "paidAmount",
    label: "Paid Amount",
    sortable: true,
    width: "140px",
    render: (student) => (
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
    ),
  },

  {
    key: "feeStatus",
    label: "Status",
    sortable: true,
    width: "180px",
    render: (student) => (
      <span
        className={`badge ${getFeeStatusBadge(
          student.feeStatus
        )}`}
      >
        {student.feeStatus === "FULLY_PAID" && (
          <FaCheckCircle className="badge-icon" />
        )}

        {student.feeStatus.replace("_", " ")}
      </span>
    ),
  },
];

const tableActions = {
  label: "Action",
  width: "200px",
  items: [
    {
      key: "promotion",
      label: "Promotion",
      icon: FaClipboardCheck,
      className: "view-btn",
      text: "Promotion",
     style: { minWidth: "100px", minHeight: "30px", gap: "5px", fontWeight: "500" },
      onClick: (student) => checkEligibility(student),
    },

    {
      key: "alumni",
      label: "Move to Alumni",
      icon: FaGraduationCap,
      className: "warning-btn",
      show: (student) =>
        student.isFinalYear && student.isAlumniEligible,
      onClick: (student) => openAlumniModal(student),
    },
  ],
};

  if (loading && students.length === 0) {
  return (
    <div className="parent-portal-wrapper">
      <div
        className="parent-portal-container parent-loading-container"
        style={{ minHeight: "70vh" }}
      >
        <Loading
          size="md"
          color="primary"
          text="Loading Student Promotion..."
        />
      </div>
    </div>
  );
}

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
               { label: "Students",},
               { label: "Student Promotion" },
             ]
           : [
               { label: "Dashboard", path: "/dashboard" },
               { label: "Students",},
               { label: "Student Promotion" },
             ]
         }
       />

      {/* Page Header */}
<PageHeader
  icon={FaGraduationCap}
  title="Student Promotion"
  subtitle="Promote students to next academic year based on fee payment status"
  actions={
    <button
      onClick={viewHistory}
      className="btn btn-outline-secondary"
    >
      <FaHistory /> View History
    </button>
  }
/>

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
            <FaGraduationCap /> {loading ? "Processing..." : "Promote All Selected"}
          </button>
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
  <>
    <StandardListView
      className="student-promotion-list"
      title="Eligible Students"
      icon={FaGraduationCap}
      count={filteredStudents.length}
      columns={columns}
      data={paginatedStudents}
      selection={{
        enabled: true,
        selectedIds: new Set(selectedStudents),
        getRowId: (student) => student._id,
        onToggle: handleSelectStudent,
        onToggleAll: handleSelectAll,
      }}
      loading={loading}
      emptyState={{
        icon: FaGraduationCap,
        title:
          students.length === 0
            ? "No Students Found"
            : "No Students Match Your Filters",
        description:
          students.length === 0
            ? 'No students with "APPROVED" status found in your college.'
            : "Try adjusting your search or semester filter.",
        action:
          students.length === 0
            ? {
                label: "Retry",
                icon: FaSyncAlt,
                onClick: fetchEligibleStudents,
              }
            : {
                label: "Reset Filters",
                icon: FaTimes,
                onClick: () => {
                  setSearch("");
                  setSemesterFilter("ALL");
                },
              },
      }}
      actions={tableActions}
    />

    {totalPages > 1 && (
      <div className="erp-pagination">
        <Pagination
          page={page}
          totalPages={totalPages}
          setPage={setPage}
        />
      </div>
    )}
  </>
)}
      

      {/* Promote Modal */}
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

      {/* Unified Promotion Modal */}
      {showEligibilityModal && eligibilityStudent && (
        <div className="modal-overlay" onClick={() => setShowEligibilityModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "800px", width: "calc(100% - 2rem)", maxHeight: "90vh" }}
          >
            <div className="modal-header">
              <h4 className="modal-title">
                <FaClipboardCheck /> Student Promotion
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
                  <p>Loading promotion details...</p>
                </div>
              ) : eligibilityError ? (
                <div className="alert alert-danger">
                  <FaExclamationCircle />
                  <div>
                    <p className="alert-text">
                      <strong>Unable to load promotion details:</strong>{" "}
                      {formatErrorCode(eligibilityError.errorCode) || eligibilityError.message}
                    </p>
                    {eligibilityError.message && eligibilityError.errorCode && (
                      <p className="alert-text" style={{ fontSize: "12px", marginTop: "8px" }}>
                        Details: {eligibilityError.message}
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
                        {eligibilityStudent.academicYearLabel ||
                          getAcademicYearLabel(
                            eligibilityStudent.currentSemester,
                            eligibilityStudent.currentYear
                          )}{" "}
                        (Sem {eligibilityStudent.currentSemester})
                      </span>
                      <span className="badge badge-secondary">
                        Course: {eligibilityStudent.course_id?.name || "N/A"}
                      </span>
                      {isFinalSemester && (
                        <span className="badge badge-warning" style={{ fontWeight: 600 }}>
                          <FaGraduationCap className="mr-1" /> Final Semester: YES
                        </span>
                      )}
                    </div>
                    {!isFinalSemester && eligibilityStudent.nextAcademicYearLabel && (
                      <div className="promotion-info" style={{ marginTop: "8px" }}>
                        <span className="badge badge-success">
                          Next: {eligibilityStudent.nextAcademicYearLabel} (Sem {eligibilityStudent.currentSemester + 1})
                        </span>
                      </div>
                    )}
                  </div>

{/* Outcome Badge - Dynamically presents Alumni Eligibility for Final Semester, Promotion for Non-Final */}
                   {isFinalSemester ? (
                     <div
                       className="outcome-banner"
                       style={{
                         background: alumniInfo.status === "CONFIGURATION_REQUIRED"
                           ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)"
                           : alumniInfo.status === "ALUMNI_DISABLED"
                           ? "linear-gradient(135deg, #4b5563 0%, #374151 100%)"
                           : alumniInfo.isEligible
                           ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                           : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                         color: "white",
                       }}
                     >
                       <div className="outcome-banner-content">
                         <div className="outcome-icon">
                           {alumniInfo.status === "CONFIGURATION_REQUIRED"
                             ? "⚠️"
                             : alumniInfo.status === "ALUMNI_DISABLED"
                             ? "🚫"
                             : alumniInfo.isEligible
                             ? "🎓"
                             : "🔴"}
                         </div>
                         <div className="outcome-text">
                           <div className="outcome-label">
                             {alumniInfo.status === "CONFIGURATION_REQUIRED"
                               ? "Alumni Settings Required"
                               : alumniInfo.status === "ALUMNI_DISABLED"
                               ? "Alumni Transition Disabled"
                               : alumniInfo.isEligible
                               ? "Eligible for Move to Alumni"
                               : "Not Eligible for Move to Alumni"}
                           </div>
                           <div className="outcome-reason" style={{ flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                             <div>
                               <strong>Reason:</strong>{" "}
                               {alumniInfo.status === "CONFIGURATION_REQUIRED"
                                 ? (alumniInfo.message || "Alumni eligibility settings are not configured for this course.")
                                 : alumniInfo.status === "ALUMNI_DISABLED"
                                 ? (alumniInfo.message || "Alumni transition is currently disabled by policy.")
                                 : alumniInfo.isEligible
                                 ? "All graduation requirements satisfied."
                                 : "Requirements for graduation have not been satisfied."}
                             </div>
                             {!alumniInfo.isEligible && alumniInfo.blockers && alumniInfo.blockers.length > 0 && (
                               <div style={{ marginTop: "6px", width: "100%", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "10px 14px" }}>
                                 <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.95 }}>
                                   Blockers:
                                 </div>
                                 <ul style={{ margin: "4px 0 0 0", paddingLeft: "18px", fontSize: "13px" }}>
                                   {alumniInfo.blockers.map((blocker, index) => (
                                     <li key={index} style={{ marginTop: "3px" }}>{blocker}</li>
                                   ))}
                                 </ul>
                               </div>
                             )}
                           </div>
                         </div>
                         <div className="outcome-actions">
                           {alumniInfo.status === "CONFIGURATION_REQUIRED" && (
                             <button
                               onClick={() => {
                                 setShowEligibilityModal(false);
                                 navigate("/system-settings/alumni");
                               }}
                               className="btn btn-warning"
                               style={{
                                 fontWeight: 700,
                                 padding: "10px 18px",
                                 whiteSpace: "nowrap",
                                 boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                 display: "inline-flex",
                                 alignItems: "center",
                                 gap: "8px",
                               }}
                               id="configure-alumni-banner-btn"
                             >
                               Configure Alumni Settings
                             </button>
                           )}
                           {alumniInfo.isEligible && (
                             <button
                               onClick={() => {
                                 setShowEligibilityModal(false);
                                 openAlumniModal(eligibilityStudent);
                               }}
                               className="btn btn-warning"
                               style={{
                                 fontWeight: 700,
                                 padding: "10px 18px",
                                 whiteSpace: "nowrap",
                                 boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                 display: "inline-flex",
                                 alignItems: "center",
                                 gap: "8px",
                               }}
                               id="move-to-alumni-banner-btn"
                             >
                               <FaGraduationCap /> Move to Alumni
                             </button>
                           )}
                         </div>
                       </div>
                     </div>
                   ) : (
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
                             <div>
                               <strong>Reason:</strong> {getCompactReasonMessage(eligibilityData)}
                             </div>
                             {eligibilityData.workflow_status && eligibilityData.workflow_status !== eligibilityData.promotion_outcome && (
                               <span className="workflow-badge">
                                 Current Step: {formatWorkflowStatus(eligibilityData.workflow_status)}
                               </span>
                             )}
                           </div>
                         </div>
                         <div className="outcome-actions">
                           {showConfirmPromotion && (
                             <button
                               onClick={openExecuteModal}
                               className="btn btn-sm btn-confirm-promotion"
                               disabled={actionLoading}
                               id="confirm-promotion-btn"
                               title={`Promote ${eligibilityStudent?.fullName} from Sem ${eligibilityStudent?.currentSemester} to Sem ${(eligibilityStudent?.currentSemester || 0) + 1}`}
                             >
                               <FaArrowRight className="mr-1" /> Confirm Promotion
                             </button>
                           )}
                         </div>
                       </div>
                     </div>
                   )}

                    {/* Compact Eligibility Status */}
                    <div style={{ marginTop: "16px" }}>
                      <h5 style={{ margin: "0 0 12px 0", color: "#0f3a4a", fontSize: "14px", fontWeight: 600 }}>
                        Eligibility Checks
                      </h5>
                      {(() => {
                        const rows = [];

                        // For final semester students with authoritative Alumni checks
                        if (isFinalSemester && alumniInfo.checks && Object.keys(alumniInfo.checks).length > 0) {
                          const checks = alumniInfo.checks;

                          if (checks.result) {
                            rows.push(
                              renderCompactStatus({
                                label: "Result",
                                passed: checks.result.passed,
                                message: checks.result.passed ? "Result is clear" : (checks.result.message || "Final semester exam result requirement not met"),
                              })
                            );
                          }

                          if (checks.attendance && !checks.attendance.skipped) {
                            rows.push(
                              renderCompactStatus({
                                label: "Attendance",
                                passed: checks.attendance.passed,
                                message: checks.attendance.passed
                                  ? `${checks.attendance.actualPercentage}% — Required: ${checks.attendance.requiredPercentage}%`
                                  : `Requirement not met (${checks.attendance.actualPercentage}% / Required: ${checks.attendance.requiredPercentage}%)`,
                              })
                            );
                          }

                          if (checks.fee && !checks.fee.skipped) {
                            rows.push(
                              renderCompactStatus({
                                label: "Fee",
                                passed: checks.fee.passed,
                                message: checks.fee.passed
                                  ? `Paid ${checks.fee.actualPercentage}% — Required: ${checks.fee.requiredPercentage}%`
                                  : `Payment requirement not met (${checks.fee.actualPercentage}% / Required: ${checks.fee.requiredPercentage}%)`,
                              })
                            );
                          }

                          if (checks.backlog) {
                            rows.push(
                              renderCompactStatus({
                                label: "Backlog Clearance",
                                passed: checks.backlog.passed,
                                message: checks.backlog.passed
                                  ? "All graduation backlog requirements satisfied"
                                  : "Uncleared backlogs found",
                              })
                            );
                          }

                          return rows;
                        }

                        // For non-final students, standard promotion checks
                        const resultStatus = getResultStatus(eligibilityData);
                        if (resultStatus) rows.push(renderCompactStatus(resultStatus));
                        
                        const attendanceStatus = getAttendanceStatus(eligibilityData);
                        if (attendanceStatus) rows.push(renderCompactStatus(attendanceStatus));
                        
                        const feeStatus = getFeeStatus(eligibilityData);
                        if (feeStatus) rows.push(renderCompactStatus(feeStatus));
                        
                        const backlogStatus = getBacklogStatus(eligibilityData, backlogs);
                        if (backlogStatus) rows.push(renderCompactStatus(backlogStatus));
                        
                        const policyStatus = getPolicyStatus(eligibilityData);
                        if (policyStatus) rows.push(renderCompactStatus(policyStatus));
                        
                        return rows;
                      })()}
                    </div>

                    {/* Failed Subjects List (only when ATKT or blocked) */}
                    {eligibilityData.failed_subject_ids && eligibilityData.failed_subject_ids.length > 0 && (
                      <div style={{ marginTop: "16px" }}>
                        <h5 style={{ margin: "0 0 8px 0", color: "#0f3a4a", fontSize: "14px", fontWeight: 600 }}>
                          Failed Subjects
                        </h5>
                        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#374151" }}>
                          {eligibilityData.failed_subject_ids.map((subj, idx) => {
                            const subjectName =
                              typeof subj === "string" ? subj : subj?.name || "";
                            const subjectCode =
                              typeof subj === "string" ? "" : subj?.code || "";
                            if (!subjectName && !subjectCode) {
                              return (
                                <li key={idx}>{String(subj)}</li>
                              );
                            }
                            return (
                              <li key={idx}>
                                {subjectCode && (
                                  <span style={{ marginRight: "6px", color: "#6b7280", fontSize: "12px" }}>
                                    {subjectCode}
                                  </span>
                                )}
                                <span>{subjectName || subjectCode}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* Backlog Details (Step 5 - read-only backlog management) - Improved UX */}
                    <div className="decision-card backlog-card" style={{ marginTop: "16px" }}>
                      <div className="decision-card-header">
                        <FaClipboardCheck style={{ color: "#3db5e6" }} />
                        <h5 style={{ margin: 0, color: "#0f3a4a", flex: 1 }}>Backlog History</h5>
                        <span className="text-muted" style={{ fontSize: "11px", fontStyle: "italic" }}>
                          Previously carried-forward subjects
                        </span>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`badge ${backlogs.length > 0 ? "badge-info" : "badge-success"}`} style={{ fontSize: "12px" }}>
                            {backlogs.length === 0
                              ? "NO BACKLOGS"
                              : `${backlogs.length} BACKLOG${backlogs.length === 1 ? "" : "S"}`}
                          </span>
                          {backlogs.length > 0 && (
                            <span className="backlog-summary text-muted" style={{ fontSize: "11px" }}>
                              {(() => {
                                const open = backlogs.filter(b => b.status === "OPEN").length;
                                const attempted = backlogs.filter(b => b.status === "ATTEMPTED").length;
                                const cleared = backlogs.filter(b => b.status === "CLEARED").length;
                                const cancelled = backlogs.filter(b => b.status === "CANCELLED").length;
                                const parts = [];
                                if (open > 0) parts.push(`Open: ${open}`);
                                if (attempted > 0) parts.push(`Attempted: ${attempted}`);
                                if (cleared > 0) parts.push(`Cleared: ${cleared}`);
                                if (cancelled > 0) parts.push(`Cancelled: ${cancelled}`);
                                return parts.join(" | ");
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="decision-card-body">
                        {/* Status filter - hidden when there are no records */}
                        {backlogs.length > 0 && (
                          <div className="backlog-filter" style={{ marginBottom: "16px" }}>
                            <div className="filter-group" style={{ flexWrap: "wrap", gap: "8px" }}>
                              {["ALL", "OPEN", "ATTEMPTED", "CLEARED", "CANCELLED"].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => setBacklogStatusFilter(status)}
                                  className={`btn btn-sm ${backlogStatusFilter === status ? "btn-primary" : "btn-outline-secondary"}`}
                                  disabled={backlogLoading}
                                >
                                  {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                                  {status !== "ALL" && (
                                    <span className="filter-count ms-1">
                                      {backlogs.filter(b => b.status === status).length}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Loading state */}
                            {backlogLoading ? (
                              <div
                                className="d-flex justify-content-center align-items-center"
                                style={{ minHeight: "180px" }}
                              >
                                <Loading
                                  size="md"
                                  color="primary"
                                  text="Loading Backlog Records..."
                                />
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
                               {getBacklogEmptyState(
                                 eligibilityData?.promotion_outcome,
                                 eligibilityStudent?.currentSemester,
                               ).title}
                             </p>
                             <p className="empty-text" style={{ marginTop: "8px", color: "#64748b", maxWidth: "400px", margin: "8px auto 0" }}>
                               {backlogStatusFilter === "ALL"
                                 ? getBacklogEmptyState(
                                     eligibilityData?.promotion_outcome,
                                     eligibilityStudent?.currentSemester,
                                   ).message
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
              {showConfirmPromotion && (
                <button
                  onClick={openExecuteModal}
                  disabled={actionLoading}
                  className="btn btn-success"
                  style={{ flex: 1 }}
                  id="confirm-promotion-footer-btn"
                >
                  <FaArrowRight /> Confirm Promotion
                </button>
              )}
              {isFinalSemester && alumniInfo.isEligible && (
                <button
                  onClick={() => {
                    setShowEligibilityModal(false);
                    openAlumniModal(eligibilityStudent);
                  }}
                  className="btn btn-warning"
                  style={{ flex: 1, fontWeight: 700 }}
                  id="move-to-alumni-footer-btn"
                >
                  <FaGraduationCap /> Move to Alumni
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

              {/* Backlog status guidance (Unified Regular + Backlog Architecture) */}
              <div
                className="backlog-status-notice"
                style={{
                  marginBottom: "16px",
                  padding: "12px 16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <p className="alert-text text-muted" style={{ margin: 0, fontSize: "13px" }}>
                  {selectedBacklog.status === "CLEARED"
                    ? "This backlog has been cleared. Full attempt history is displayed below."
                    : selectedBacklog.status === "ATTEMPTED"
                      ? "This backlog is scheduled in an exam. Evaluation will update once teacher marks are recorded."
                      : "This backlog is currently OPEN. Eligible backlog subjects are scheduled in the Unified Exam Timetable by the Exam Coordinator, and marks are entered by the assigned teacher."}
                </p>
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
                      ? "No attempts recorded for this backlog yet."
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
                        <th>Action</th>
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
                            {attempt.result_status === "PASS" || attempt.passed === true ? (
                              <span className="badge badge-success">Passed</span>
                            ) : attempt.result_status === "INCOMPLETE" ? (
                              <span className="badge badge-warning">Pending</span>
                            ) : attempt.result_status === "FAIL" || attempt.passed === false ? (
                              <span className="badge badge-danger">Failed</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {attempt.result_status === "INCOMPLETE" && selectedBacklog?.status !== "CLEARED" ? (
                              <button
                                onClick={() => handleEvaluateAttempt(attempt._id)}
                                disabled={evaluatingAttemptId === attempt._id}
                                className="btn btn-sm btn-primary"
                                style={{ padding: "4px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                title="Evaluate backlog attempt based on teacher marks"
                              >
                                {evaluatingAttemptId === attempt._id && <FaSpinner className="spinner-icon" />}
                                Evaluate
                              </button>
                            ) : (
                              <span className="text-muted" style={{ fontSize: "12px" }}>-</span>
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

      {/* Confirm Promotion Modal */}
      {showExecuteModal && eligibilityStudent && eligibilityData && (
        <ConfirmModal
          isOpen={showExecuteModal}
          onClose={() => setShowExecuteModal(false)}
          onConfirm={handleExecute}
          title="Confirm Promotion"
          message={
            `Promote ${eligibilityStudent.fullName} from ` +
            `Semester ${eligibilityStudent.currentSemester} → Semester ${eligibilityStudent.currentSemester + 1}` +
            (eligibilityStudent.nextAcademicYearLabel
              ? ` (${eligibilityStudent.nextAcademicYearLabel})`
              : "") +
            (eligibilityData.promotion_outcome === "ATKT"
              ? `\n\n⚠️ ATKT: Student has ${eligibilityData.kt_count ?? 0} failed subject${eligibilityData.kt_count === 1 ? "" : "s"} that will carry forward as backlogs.`
              : "") +
            `\n\nThis action will update the student's semester and assign fees for the new semester. It cannot be undone.`
          }
          type="warning"
          confirmText="Confirm Promotion"
          cancelText="Cancel"
          isLoading={actionLoading}
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
                      <table className="data-table promotion-students-table">
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
          background: #0E3746;
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
.page-header {
  background: #0E3746;
  color: #ffffff;
  border-radius: 16px;
  padding: 0.9rem 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 24px rgba(14, 55, 70, 0.22);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-icon-box {
  width: 52px;
  height: 52px;
  min-width: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon {
  color: white;
  font-size: 38px;
}

.header-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.page-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.page-subtitle {
  opacity: 1;
  font-size: 0.85rem;
  font-weight: 400;
  line-height: 1.5;
  color: rgba(255,255,255,0.72);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
          background: #0E3746;
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
          background: #ffffff;
          border-color: rgba(255, 255, 255, 0.6);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
          color: #0E3746;
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

                /* Student Promotion - keep the complete table visible */
        .promotion-students-table {
          width: 100%;
          table-layout: fixed;
        };
        

        .promotion-students-table th,
        .promotion-students-table td {
          white-space: nowrap;
        }

        .promotion-students-table th:nth-child(1),
        .promotion-students-table td:nth-child(1) {
          width: 55px;
        }

        .promotion-students-table th:nth-child(2),
        .promotion-students-table td:nth-child(2) {
          width: 22%;
        }

        .promotion-students-table th:nth-child(3),
        .promotion-students-table td:nth-child(3) {
          width: 15%;
        }

        .promotion-students-table th:nth-child(4),
        .promotion-students-table td:nth-child(4) {
          width: 12%;
        }

        .promotion-students-table th:nth-child(5),
        .promotion-students-table td:nth-child(5) {
          width: 13%;
        }

        .promotion-students-table th:nth-child(6),
        .promotion-students-table td:nth-child(6) {
          width: 14%;
        }

        .promotion-students-table th:nth-child(7),
        .promotion-students-table td:nth-child(7) {
          width: 24%;
        }

        .promotion-students-table td:last-child .d-flex {
          flex-wrap: nowrap;
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

          .policy-icon.fee {
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            color: #047857;
          }

          .policy-icon.backlog {
            background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
            color: #6d28d9;
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
            background: #ffffff;
            color: #065f46;
            border: none;
            font-weight: 600;
          }

          .outcome-actions .btn-light:hover {
            background: rgba(255, 255, 255, 0.95);
            color: #047857;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .outcome-actions .btn-confirm-promotion,
          #confirm-promotion-btn {
            background: #ffffff !important;
            color: #065f46 !important;
            border: 1.5px solid rgba(255, 255, 255, 0.95) !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            padding: 8px 16px !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18) !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            cursor: pointer !important;
            transition: all 0.2s ease-in-out !important;
          }

          .outcome-actions .btn-confirm-promotion:hover,
          #confirm-promotion-btn:hover {
            background: #f0fdf4 !important;
            color: #047857 !important;
            border-color: #ffffff !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25) !important;
          }

          .outcome-actions .btn-confirm-promotion:active,
          #confirm-promotion-btn:active {
            transform: translateY(0) !important;
          }

          .outcome-actions .btn-confirm-promotion svg,
          #confirm-promotion-btn svg {
            color: #059669 !important;
            font-size: 12px !important;
            transition: transform 0.2s ease !important;
          }

          .outcome-actions .btn-confirm-promotion:hover svg,
          #confirm-promotion-btn:hover svg {
            transform: translateX(2px) !important;
          }

          #confirm-promotion-footer-btn {
            background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
            color: #ffffff !important;
            border: none !important;
            font-weight: 600 !important;
            font-size: 14px !important;
            padding: 10px 20px !important;
            border-radius: 10px !important;
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3) !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            transition: all 0.2s ease !important;
          }

          #confirm-promotion-footer-btn:hover {
            background: linear-gradient(135deg, #047857 0%, #065f46 100%) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 6px 16px rgba(5, 150, 105, 0.4) !important;
          }

          #confirm-promotion-footer-btn svg {
            color: #ffffff !important;
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
