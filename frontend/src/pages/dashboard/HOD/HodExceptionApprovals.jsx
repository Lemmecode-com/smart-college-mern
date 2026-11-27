import { useContext, useEffect, useState, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import Pagination from "../../../components/Pagination";
import CustomSelect from "../../../components/CustomSelect";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./HodExceptionApprovals.css";
import {
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaCalendarAlt,
  FaUser,
  FaBook,
  FaClock,
  FaUndo,
  FaSearch,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "CANCELLED", label: "Cancelled Class" },
  { value: "EXTRA", label: "Extra/Makeup Class" },
  { value: "RESCHEDULED", label: "Rescheduled Class" },
  { value: "ROOM_CHANGE", label: "Room Change" },
  { value: "TEACHER_CHANGE", label: "Teacher Change" },
  { value: "SPECIAL_EVENT", label: "Special Event" },
  { value: "EXAM", label: "Exam Schedule" },
];

const STATUS_COLORS = {
  PENDING: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  APPROVED: { bg: "#e0f2fe", text: "#075985", border: "#bae6fd" },
  REJECTED: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
  WITHDRAWN: { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
};

const EXCEPTION_TYPES = {
  HOLIDAY: "Holiday",
  CANCELLED: "Cancelled Class",
  EXTRA: "Extra/Makeup Class",
  RESCHEDULED: "Rescheduled Class",
  ROOM_CHANGE: "Room Change",
  TEACHER_CHANGE: "Teacher Change",
  SPECIAL_EVENT: "Special Event",
  EXAM: "Exam Schedule",
};

const MotionDiv = motion.div;
const MotionButton = motion.button;

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

export default function HodExceptionApprovals() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("pending");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [history, setHistory] = useState({ approved: [], rejected: [], withdrawn: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    exceptionId: null,
    reason: "",
  });
  const [approveModal, setApproveModal] = useState({
    isOpen: false,
    exceptionId: null,
  });

  // Search and filter state
  const [searchTeacher, setSearchTeacher] = useState("");
  const [searchSubject, setSearchSubject] = useState("");
  const [searchType, setSearchType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
    // Debounce refs
  const searchTeacherRef = useRef(null);
  const searchSubjectRef = useRef(null);
  const searchTypeRef = useRef(null);

  // Combined search and filter params
  const getSearchParams = () => ({
    page: currentPage,
    limit: 20,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    search: searchTeacher || searchSubject || undefined,
  });

  const fetchPending = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = getSearchParams();
      const res = await api.get("/timetable/exceptions/pending", { params });
      const data = res.data?.data || res.data || {};
      setPendingRequests(data.exceptions || []);
      setTotalPages(data.pagination?.totalPages || 1);
      
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to load pending requests";
      setError({ message: errorMsg, statusCode: err.response?.status, errorCode: err.response?.data?.code });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = getSearchParams();
      const res = await api.get("/timetable/exceptions/history", { params });
      const data = res.data?.data || res.data || {};
      setHistory({
        approved: data.approved || [],
        rejected: data.rejected || [],
        withdrawn: data.withdrawn || [],
      });
      setTotalPages(data.pagination?.totalPages || 1);
      
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to load approval history";
      setError({ message: errorMsg, statusCode: err.response?.status, errorCode: err.response?.data?.code });
    } finally {
      setLoading(false);
    }
  };

  

  // Debounced search for teacher
  useEffect(() => {
    if (searchTeacherRef.current) {
      clearTimeout(searchTeacherRef.current);
    }
    searchTeacherRef.current = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(searchTeacherRef.current);
  }, [searchTeacher]);

  // Debounced search for subject
  useEffect(() => {
    if (searchSubjectRef.current) {
      clearTimeout(searchSubjectRef.current);
    }
    searchSubjectRef.current = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(searchSubjectRef.current);
  }, [searchSubject]);

  // Debounced search for type
  useEffect(() => {
    if (searchTypeRef.current) {
      clearTimeout(searchTypeRef.current);
    }
    searchTypeRef.current = setTimeout(() => {
      setTypeFilter(searchType);
    }, 300);
    return () => clearTimeout(searchTypeRef.current);
  }, [searchType]);

  useEffect(() => {
    if (activeTab === "pending") {
      fetchPending();
    } else {
      fetchHistory();
    }
  }, [activeTab, currentPage, statusFilter, typeFilter, searchTeacher, searchSubject]);

  const openApproveModal = (exceptionId) => {
    setApproveModal({ isOpen: true, exceptionId });
  };

  const handleApprove = async () => {
    if (!approveModal.exceptionId) return;

    try {
      setActionLoading(true);
      await api.put(`/timetable/exceptions/${approveModal.exceptionId}/approve`);
      toast.success("Exception approved successfully", {
        position: "top-right",
        autoClose: 3000,
      });
      setApproveModal({ isOpen: false, exceptionId: null });
      fetchPending();
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));
      if (!isAuthError) {
        toast.error(
          err.response?.data?.message || "Failed to approve exception",
          { position: "top-right", autoClose: 5000 },
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (exceptionId) => {
    setRejectModal({ isOpen: true, exceptionId, reason: "" });
  };

  const handleReject = async () => {
    if (!rejectModal.reason.trim()) {
      toast.error("Please provide a rejection reason", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    try {
      setActionLoading(true);
      await api.put(`/timetable/exceptions/${rejectModal.exceptionId}/reject`, {
        rejectionReason: rejectModal.reason.trim(),
      });
      toast.success("Exception rejected", {
        position: "top-right",
        autoClose: 3000,
      });
      setRejectModal({ isOpen: false, exceptionId: null, reason: "" });
      fetchPending();
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));
      if (!isAuthError) {
        toast.error(
          err.response?.data?.message || "Failed to reject exception",
          { position: "top-right", autoClose: 5000 },
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderExceptionDetails = (exc, options = {}) => {
    const rows = [];

    if (exc.type === "ROOM_CHANGE" && exc.newRoom?.trim()) {
      rows.push({ label: "New Room", value: exc.newRoom });
    }

    if (exc.type === "TEACHER_CHANGE" && exc.substituteTeacher?.name) {
      rows.push({ label: "Substitute Teacher", value: exc.substituteTeacher.name });
    }

    if (exc.type === "EXTRA") {
      const startTime = exc.extraSlot?.startTime;
      const endTime = exc.extraSlot?.endTime;
      const room = exc.extraSlot?.room?.trim();

      if (startTime || endTime) {
        rows.push({
          label: "Extra Slot",
          value: `${startTime || "N/A"} - ${endTime || "N/A"}`,
        });
      }

      if (room) {
        rows.push({ label: "Room", value: room });
      }
    }

    if (exc.type === "RESCHEDULED") {
      if (exc.rescheduledTo) {
        rows.push({ label: "Rescheduled To", value: formatDate(exc.rescheduledTo) });
      }

      if (
        exc.rescheduledSlotId?.day ||
        exc.rescheduledSlotId?.startTime ||
        exc.rescheduledSlotId?.endTime
      ) {
        rows.push({
          label: "Rescheduled Slot",
          value: `${exc.rescheduledSlotId?.day || "N/A"}, ${
            exc.rescheduledSlotId?.startTime || "N/A"
          } - ${exc.rescheduledSlotId?.endTime || "N/A"}`,
        });
      }
    }

    if (options.showActionBy) {
      if (exc.status === "APPROVED" && exc.approvedBy?.name) {
        rows.push({ label: "Approved By", value: exc.approvedBy.name });
      }

      if (exc.status === "REJECTED" && exc.rejectedBy?.name) {
        rows.push({ label: "Rejected By", value: exc.rejectedBy.name });
      }

      if (exc.status === "WITHDRAWN" && exc.withdrawnBy?.name) {
        rows.push({ label: "Withdrawn By", value: exc.withdrawnBy.name });
      }
    }

    if (rows.length === 0) return null;

    return (
      <div className="hod-exc-extra">
        {rows.map((row) => (
          <div className="hod-exc-extra-item" key={row.label}>
            <div className="hod-exc-extra-label">{row.label}</div>
            <div className="hod-exc-extra-value">{row.value}</div>
          </div>
        ))}
      </div>
    );
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTeacher("");
    setSearchSubject("");
    setSearchType("");
    setStatusFilter("");
    setTypeFilter("");
    setCurrentPage(1);
  };

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "HOD") return <Navigate to="/hod/dashboard" />;

// Loading State
if (
  loading &&
  pendingRequests.length === 0 &&
  history.approved.length === 0 &&
  history.rejected.length === 0 &&
  history.withdrawn.length === 0
) {
  return (
    <div className="parent-portal-wrapper">
      <div
        className="parent-portal-container parent-loading-container"
        style={{ minHeight: "70vh" }}
      >
        <Loading
          size="md"
          color="primary"
          text="Loading Exception Approvals..."
        />
      </div>
    </div>
  );
}

  if (error && pendingRequests.length === 0 && history.approved.length === 0 && history.rejected.length === 0 && history.withdrawn.length === 0) {
    return (
      <ApiError
        title="Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={activeTab === "pending" ? fetchPending : fetchHistory}
        onGoBack={() => navigate("/hod/dashboard")}
      />
    );
  }

  const renderPendingCard = (exc, index) => (
    <MotionDiv
      key={exc._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="hod-exc-card"
    >
      <div className="hod-exc-card-accent hod-exc-card-accent--pending" aria-hidden="true" />
      <div className="hod-exc-card-header">
        <div className="hod-exc-card-heading">
          <h3 className="hod-exc-card-title">
            {EXCEPTION_TYPES[exc.type] || exc.type || "Exception Request"}
          </h3>
          <p className="hod-exc-card-subtitle">
            {exc.timetable_id?.name ? `${exc.timetable_id.name}` : "Timetable exception"}
            {exc.timetable_id?.semester ? ` · Semester ${exc.timetable_id.semester}` : ""}
          </p>
        </div>
        <span className="hod-exc-status-badge hod-exc-status-badge--pending">
          <FaClock aria-hidden="true" />
          <span>Pending Approval</span>
        </span>
      </div>

      <div className="hod-exc-grid">
        <div className="hod-exc-info">
          <div className="hod-exc-info-icon"><FaUser aria-hidden="true" /></div>
          <div className="hod-exc-info-body">
            <div className="hod-exc-info-label">Teacher</div>
            <div className="hod-exc-info-value">{exc.createdBy?.name || "Unknown Teacher"}</div>
          </div>
        </div>
        <div className="hod-exc-info">
          <div className="hod-exc-info-icon"><FaBook aria-hidden="true" /></div>
          <div className="hod-exc-info-body">
            <div className="hod-exc-info-label">Subject</div>
            <div className="hod-exc-info-value">{exc.slot_id?.subject_id?.name || "N/A"}</div>
          </div>
        </div>
        <div className="hod-exc-info">
          <div className="hod-exc-info-icon"><FaCalendarAlt aria-hidden="true" /></div>
          <div className="hod-exc-info-body">
            <div className="hod-exc-info-label">Exception Date</div>
            <div className="hod-exc-info-value">{formatDate(exc.exceptionDate)}</div>
          </div>
        </div>
        <div className="hod-exc-info">
          <div className="hod-exc-info-icon"><FaClock aria-hidden="true" /></div>
          <div className="hod-exc-info-body">
            <div className="hod-exc-info-label">Requested At</div>
            <div className="hod-exc-info-value">{formatDateTime(exc.createdAt)}</div>
          </div>
        </div>
      </div>

      {exc.reason && (
        <div className="hod-exc-reason-block">
          <div className="hod-exc-reason-head">
            <FaInfoCircle aria-hidden="true" />
            <span>Reason</span>
          </div>
          <p className="hod-exc-reason-text">{exc.reason}</p>
        </div>
      )}

      {renderExceptionDetails(exc)}

      <div className="hod-exc-footer">
        <div className="hod-exc-timestamp">
          <FaClock aria-hidden="true" />
          <span>Requested: <strong>{formatDateTime(exc.createdAt)}</strong></span>
        </div>
        <div className="hod-exc-actions">
          <button
            type="button"
            onClick={() => openApproveModal(exc._id)}
            disabled={actionLoading}
            className="hod-exc-btn hod-exc-btn--approve"
          >
            <FaCheck aria-hidden="true" />
            <span>Approve</span>
          </button>
          <button
            type="button"
            onClick={() => openRejectModal(exc._id)}
            disabled={actionLoading}
            className="hod-exc-btn hod-exc-btn--reject"
          >
            <FaTimes aria-hidden="true" />
            <span>Reject</span>
          </button>
        </div>
      </div>
    </MotionDiv>
  );

  const renderHistoryCard = (exc, index, type) => {
    const actionBy =
      type === "approved"
        ? exc.approvedBy
        : type === "rejected"
          ? exc.rejectedBy
          : exc.withdrawnBy;
    const actionAt =
      type === "approved"
        ? exc.approvedAt
        : type === "rejected"
          ? exc.rejectedAt
          : exc.withdrawnAt;
    const actionLabel =
      type === "approved"
        ? "Approved By"
        : type === "rejected"
          ? "Rejected By"
          : "Withdrawn By";
    const statusLabel =
      type === "approved"
        ? "Approved"
        : type === "rejected"
          ? "Rejected"
          : "Withdrawn";
    const statusIcon =
      type === "approved" ? (
        <FaCheck aria-hidden="true" />
      ) : type === "rejected" ? (
        <FaTimes aria-hidden="true" />
      ) : (
        <FaUndo aria-hidden="true" />
      );
    const accentClass =
      type === "approved"
        ? "hod-exc-card-accent--approved"
        : type === "rejected"
          ? "hod-exc-card-accent--rejected"
          : "hod-exc-card-accent--withdrawn";
    const badgeClass =
      type === "approved"
        ? "hod-exc-status-badge--approved"
        : type === "rejected"
          ? "hod-exc-status-badge--rejected"
          : "hod-exc-status-badge--withdrawn";

    return (
      <MotionDiv
        key={exc._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="hod-exc-card"
      >
        <div className={`hod-exc-card-accent ${accentClass}`} aria-hidden="true" />
        <div className="hod-exc-card-header">
          <div className="hod-exc-card-heading">
            <h3 className="hod-exc-card-title">
              {EXCEPTION_TYPES[exc.type] || exc.type || "Exception Request"}
            </h3>
            <p className="hod-exc-card-subtitle">
              {exc.timetable_id?.name ? `${exc.timetable_id.name}` : "Timetable exception"}
              {exc.timetable_id?.semester ? ` · Semester ${exc.timetable_id.semester}` : ""}
            </p>
          </div>
          <span className={`hod-exc-status-badge ${badgeClass}`}>
            {statusIcon}
            <span>{statusLabel}</span>
          </span>
        </div>

        <div className="hod-exc-grid">
          <div className="hod-exc-info">
            <div className="hod-exc-info-icon"><FaUser aria-hidden="true" /></div>
            <div className="hod-exc-info-body">
              <div className="hod-exc-info-label">Teacher</div>
              <div className="hod-exc-info-value">{exc.createdBy?.name || "Unknown Teacher"}</div>
            </div>
          </div>
          <div className="hod-exc-info">
            <div className="hod-exc-info-icon"><FaBook aria-hidden="true" /></div>
            <div className="hod-exc-info-body">
              <div className="hod-exc-info-label">Subject</div>
              <div className="hod-exc-info-value">{exc.slot_id?.subject_id?.name || "N/A"}</div>
            </div>
          </div>
          <div className="hod-exc-info">
            <div className="hod-exc-info-icon"><FaCalendarAlt aria-hidden="true" /></div>
            <div className="hod-exc-info-body">
              <div className="hod-exc-info-label">Exception Date</div>
              <div className="hod-exc-info-value">{formatDate(exc.exceptionDate)}</div>
            </div>
          </div>
          <div className="hod-exc-info">
            <div className="hod-exc-info-icon"><FaUser aria-hidden="true" /></div>
            <div className="hod-exc-info-body">
              <div className="hod-exc-info-label">{actionLabel}</div>
              <div className="hod-exc-info-value">{actionBy?.name || "N/A"}</div>
            </div>
          </div>
        </div>

        {exc.reason && (
          <div className="hod-exc-reason-block">
            <div className="hod-exc-reason-head">
              <FaInfoCircle aria-hidden="true" />
              <span>Reason</span>
            </div>
            <p className="hod-exc-reason-text">{exc.reason}</p>
          </div>
        )}

        {renderExceptionDetails(exc)}

        {type === "rejected" && exc.rejectionReason && (
          <div className="hod-exc-reason-block hod-exc-reason-block--danger">
            <div className="hod-exc-reason-head">
              <FaTimes aria-hidden="true" />
              <span>Rejection Reason</span>
            </div>
            <p className="hod-exc-reason-text">{exc.rejectionReason}</p>
          </div>
        )}

        {type === "withdrawn" && exc.withdrawalReason && (
          <div className="hod-exc-reason-block hod-exc-reason-block--neutral">
            <div className="hod-exc-reason-head">
              <FaUndo aria-hidden="true" />
              <span>Withdrawal Reason</span>
            </div>
            <p className="hod-exc-reason-text">{exc.withdrawalReason}</p>
          </div>
        )}

        <div className="hod-exc-footer">
          <div className="hod-exc-timestamp">
            <FaCalendarAlt aria-hidden="true" />
            <span>{statusLabel} At: <strong>{formatDateTime(actionAt)}</strong></span>
          </div>
        </div>
      </MotionDiv>
    );
  };

  return (
    <div
      className="container-fluid p-0"
      style={{
        minHeight: "100vh",
        paddingTop: "0.5rem",
        background: "linear-gradient(135deg, #f0f4f8 0%, #e8edf2 100%)",
      }}
    >
       {/* Breadcrumb - ABOVE Exception Approvals Banner */}
            <div
              style={{
                width: "auto",
                margin: "0 24px",
                paddingTop: 0,
                height: "auto",
              }}
            >
              <div style={{ width: "100%" }}>
                <Breadcrumb
                  items={[
                    { label: "Dashboard", path: "/hod/dashboard" },
                    { label: "Exception Approvals" },
                  ]}
                />
              </div>
            </div>

        {/* ================= PAGE HEADER ================= */}
        <div className="page-header-compo">
        <PageHeader
          icon={FaExclamationTriangle}
          title="Exception Approvals"
          subtitle="Review and manage teacher exception requests"
        />

        <style>{`
          .page-header-compo {
            margin: 0 24px 24px 24px;
            margin-bottom: -1.5rem;
          }
        `}</style>
        </div>

      <div className="hod-exc-page">
        <div className="hod-exc-shell">
          <div className="hod-exc-tabs-wrap">
            <div className="hod-exc-tabs" role="tablist" aria-label="Exception approvals tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "pending"}
                onClick={() => setActiveTab("pending")}
                className={`hod-exc-tab ${activeTab === "pending" ? "is-active" : ""}`}
              >
                <FaClock className="hod-exc-tab-icon" aria-hidden="true" />
                <span>Pending Approvals</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "history"}
                onClick={() => setActiveTab("history")}
                className={`hod-exc-tab ${activeTab === "history" ? "is-active" : ""}`}
              >
                <FaExclamationTriangle className="hod-exc-tab-icon" aria-hidden="true" />
                <span>Approval History</span>
              </button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="hod-exc-filters">
            <div className="hod-exc-filters-grid">
              <div className="hod-exc-field">
                <label className="hod-exc-label">
                  <FaSearch aria-hidden="true" />
                  Teacher Name
                </label>
                <input
                  type="text"
                  className="hod-exc-input"
                  placeholder="Search teacher..."
                  value={searchTeacher}
                  onChange={(e) => setSearchTeacher(e.target.value)}
                />
              </div>

              <div className="hod-exc-field">
                <label className="hod-exc-label">
                  <FaSearch aria-hidden="true" />
                  Subject Name
                </label>
                <input
                  type="text"
                  className="hod-exc-input"
                  placeholder="Search subject..."
                  value={searchSubject}
                  onChange={(e) => setSearchSubject(e.target.value)}
                />
              </div>

              <div className="hod-exc-field">
                <label className="hod-exc-label">
                  <FaSearch aria-hidden="true" />
                  Exception Type
                </label>
                <CustomSelect
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  options={TYPE_OPTIONS}
                  placeholder="All Types"
                  aria-label="Search by exception type"
                />
              </div>

              <div className="hod-exc-field">
                <label className="hod-exc-label">Status</label>
                <CustomSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={STATUS_OPTIONS}
                  placeholder="All Status"
                  aria-label="Filter by status"
                />
              </div>
            </div>

            <div className="hod-exc-filters-footer">
              <div className="hod-exc-meta">
                Showing records
                {totalPages > 1 && (
                  <>
                    {" "}
                    <span>
                      (Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>)
                    </span>
                  </>
                )}
              </div>
              {(searchTeacher || searchSubject || searchType || statusFilter || typeFilter) && (
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClearFilters}
                  className="hod-exc-clear-btn"
                  type="button"
                >
                  Clear Filters
                </MotionButton>
              )}
            </div>
          </div>

          <div className="hod-exc-content">
              <AnimatePresence mode="wait">
                {activeTab === "pending" && (
                  <MotionDiv
                    key="pending"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {loading ? (
                      <div className="hod-exc-loading">
                        <Loading size="md" text="Loading pending requests..." />
                      </div>
                    ) : pendingRequests.length === 0 ? (
                      <MotionDiv
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="hod-exc-content-section-head">
                          <h6 className="hod-exc-content-section-title">Pending Approvals</h6>
                          <span className="hod-exc-content-section-badge">0 pending</span>
                        </div>
                        <div className="hod-exc-empty">
                          <div className="hod-exc-empty-card">
                            <div className="hod-exc-empty-icon" aria-hidden="true">
                              <FaCheck />
                            </div>
                            <h5 className="hod-exc-empty-title">You're All Caught Up!</h5>
                            <p className="hod-exc-empty-text">
                              No pending exception requests at the moment. New requests will appear here for review.
                            </p>
                          </div>
                        </div>
                      </MotionDiv>
                    ) : (
                      <>
                        <div className="hod-exc-content-section-head">
                          <h6 className="hod-exc-content-section-title">Pending Approvals</h6>
                          <span className="hod-exc-content-section-badge">
                            {pendingRequests.length} {pendingRequests.length === 1 ? "pending request" : "pending requests"}
                          </span>
                        </div>
                        {pendingRequests.map((exc, index) => renderPendingCard(exc, index))}
                      </>
                    )}
                  </MotionDiv>
                )}

                {activeTab === "history" && (
                  <MotionDiv
                    key="history"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {loading ? (
                      <div className="hod-exc-loading">
                        <Loading size="md" text="Loading history..." />
                      </div>
                    ) : history.approved.length === 0 && history.rejected.length === 0 && history.withdrawn.length === 0 ? (
                      <MotionDiv
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="hod-exc-empty"
                      >
                        <div className="hod-exc-empty-card">
                          <div className="hod-exc-empty-history-icon" aria-hidden="true">
                            <FaExclamationTriangle />
                          </div>
                          <h5 className="hod-exc-empty-title">No History Yet</h5>
                          <p className="hod-exc-empty-text">
                            Approved, rejected, and withdrawn exceptions will appear here once actions are taken.
                          </p>
                          <div className="hod-exc-empty-status hod-exc-empty-status--neutral">
                            <span className="hod-exc-empty-status-dot" aria-hidden="true" />
                            <span>0 history records</span>
                          </div>
                        </div>
                      </MotionDiv>
                    ) : (
                      <>
                        {history.approved.length > 0 && (
                          <section className="hod-exc-history-section" aria-label="Approved requests">
                            <div className="hod-exc-section-heading">
                              <h6 className="hod-exc-section-title hod-exc-section-title--approved">
                                <FaCheck aria-hidden="true" />
                                <span>Approved Requests</span>
                              </h6>
                              <span className="hod-exc-count-badge hod-exc-count-badge--approved">
                                {history.approved.length} {history.approved.length === 1 ? "record" : "records"}
                              </span>
                            </div>
                            {history.approved.map((exc, index) =>
                              renderHistoryCard(exc, index, "approved"),
                            )}
                          </section>
                        )}
                        {history.rejected.length > 0 && (
                          <section className="hod-exc-history-section" aria-label="Rejected requests">
                            <div className="hod-exc-section-heading">
                              <h6 className="hod-exc-section-title hod-exc-section-title--rejected">
                                <FaTimes aria-hidden="true" />
                                <span>Rejected Requests</span>
                              </h6>
                              <span className="hod-exc-count-badge">
                                {history.rejected.length} {history.rejected.length === 1 ? "record" : "records"}
                              </span>
                            </div>
                            {history.rejected.map((exc, index) =>
                              renderHistoryCard(exc, index, "rejected"),
                            )}
                          </section>
                        )}
                        {history.withdrawn.length > 0 && (
                          <section className="hod-exc-history-section" aria-label="Withdrawn requests">
                            <div className="hod-exc-section-heading">
                              <h6 className="hod-exc-section-title hod-exc-section-title--withdrawn">
                                <FaUndo aria-hidden="true" />
                                <span>Withdrawn Requests</span>
                              </h6>
                              <span className="hod-exc-count-badge">
                                {history.withdrawn.length} {history.withdrawn.length === 1 ? "record" : "records"}
                              </span>
                            </div>
                            {history.withdrawn.map((exc, index) =>
                              renderHistoryCard(exc, index, "withdrawn"),
                            )}
                          </section>
                        )}
                      </>
                    )}
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      <AnimatePresence>
        {rejectModal.isOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal show d-block"
            tabIndex="-1"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          >
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="modal-dialog modal-dialog-centered"
              style={{ maxWidth: "500px" }}
            >
              <div
                className="modal-content border-0 shadow-lg"
                style={{ borderRadius: "16px", overflow: "hidden" }}
              >
                <div
                  className="modal-header border-0 text-white p-3"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--sidebar-bg-gradient-start, #0f3a4a) 0%, var(--sidebar-bg-gradient-end, #0c2d3a) 100%)",
                  }}
                >
                  <h5 className="modal-title fw-bold mb-0">Reject Exception Request</h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white opacity-75"
                    onClick={() =>
                      setRejectModal({ isOpen: false, exceptionId: null, reason: "" })
                    }
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                </div>
                <div className="modal-body p-4" style={{ background: "#f8fafc" }}>
                  <div className="alert alert-warning border-0 mb-3" style={{ background: "#fffbeb", borderRadius: "10px", color: "#92400e" }}>
                    <FaInfoCircle className="me-2" />
                    Please provide a reason for rejecting this exception request.
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold text-dark mb-2">
                      Rejection Reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control border-0"
                      rows="4"
                      value={rejectModal.reason}
                      onChange={(e) =>
                        setRejectModal({ ...rejectModal, reason: e.target.value })
                      }
                      placeholder="Enter the reason for rejection..."
                      style={{
                        background: "white",
                        borderRadius: "10px",
                        padding: "1rem",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                  </div>
                </div>
                <div
                  className="modal-footer border-0 d-flex gap-2 p-3"
                  style={{ background: "white" }}
                >
                  <button
                    onClick={() =>
                      setRejectModal({ isOpen: false, exceptionId: null, reason: "" })
                    }
                    className="btn px-4 py-2 fw-medium"
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      color: "#64748b",
                      borderRadius: "8px",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading || !rejectModal.reason.trim()}
                    className="btn px-4 py-2 fw-bold text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                      opacity:
                        actionLoading || !rejectModal.reason.trim() ? 0.7 : 1,
                    }}
                  >
                    <FaTimes className="me-1" />
                    {actionLoading ? "Rejecting..." : "Confirm Reject"}
                  </button>
                </div>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Approve Confirmation Modal */}
      <AnimatePresence>
        {approveModal.isOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal show d-block"
            tabIndex="-1"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          >
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="modal-dialog modal-dialog-centered"
              style={{ maxWidth: "500px" }}
            >
              <div
                className="modal-content border-0 shadow-lg"
                style={{ borderRadius: "16px", overflow: "hidden" }}
              >
                <div
                  className="modal-header border-0 text-white p-3"
                  style={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  }}
                >
                  <h5 className="modal-title fw-bold mb-0">Approve Exception Request</h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white opacity-75"
                    onClick={() =>
                      setApproveModal({ isOpen: false, exceptionId: null })
                    }
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                </div>
                <div className="modal-body p-4" style={{ background: "#f8fafc" }}>
                  <div
                    className="alert alert-info border-0 mb-3"
                    style={{
                      background: "#d1fae5",
                      borderRadius: "10px",
                      color: "#065f46",
                    }}
                  >
                    <FaInfoCircle className="me-2" />
                    This action will notify all affected teachers and students.
                  </div>
                  {(() => {
                    const exc = pendingRequests.find(
                      (e) => e._id === approveModal.exceptionId,
                    );
                    if (!exc) return null;
                    return (
                      <div className="small text-muted">
                        <div className="mb-2">
                          <strong>Date:</strong>{" "}
                          {exc.exceptionDate
                            ? new Date(exc.exceptionDate).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  month: "short",
                                  day: "numeric",
                                },
                              )
                            : "N/A"}
                        </div>
                        <div className="mb-2">
                          <strong>Type:</strong>{" "}
                          {EXCEPTION_TYPES[exc.type] || exc.type}
                        </div>
                        <div className="mb-2">
                          <strong>Teacher:</strong>{" "}
                          {exc.createdBy?.name || "Unknown"}
                        </div>
                        <div className="mb-2">
                          <strong>Reason:</strong> {exc.reason}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div
                  className="modal-footer border-0 d-flex gap-2 p-3"
                  style={{ background: "white" }}
                >
                  <button
                    onClick={() =>
                      setApproveModal({ isOpen: false, exceptionId: null })
                    }
                    disabled={actionLoading}
                    className="btn px-4 py-2 fw-medium"
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      color: "#64748b",
                      borderRadius: "8px",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="btn px-4 py-2 fw-bold text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                      opacity: actionLoading ? 0.7 : 1,
                    }}
                  >
                    <FaCheck className="me-1" />
                    {actionLoading ? "Approving..." : "Confirm Approve"}
                  </button>
                </div>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
