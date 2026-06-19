import { useContext, useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import Pagination from "../../../components/Pagination";
import CustomSelect from "../../../components/CustomSelect";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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

export default function HodExceptionApprovals() {
  const { user } = useContext(AuthContext);

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
      setError({ message: errorMsg, statusCode: err.response?.status });
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
      setError({ message: errorMsg, statusCode: err.response?.status });
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
      toast.error(
        err.response?.data?.message || "Failed to approve exception",
        {
          position: "top-right",
          autoClose: 5000,
        },
      );
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
      toast.error(err.response?.data?.message || "Failed to reject exception", {
        position: "top-right",
        autoClose: 5000,
      });
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

  if (loading && pendingRequests.length === 0 && history.approved.length === 0 && history.rejected.length === 0 && history.withdrawn.length === 0) {
    return (
      <Loading
        fullScreen
        size="lg"
        text="Loading Exception Approvals..."
        color="primary"
      />
    );
  }

  if (error && pendingRequests.length === 0 && history.approved.length === 0 && history.rejected.length === 0 && history.withdrawn.length === 0) {
    return (
      <ApiError
        title="Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        onRetry={activeTab === "pending" ? fetchPending : fetchHistory}
      />
    );
  }

  const renderPendingCard = (exc, index) => (
    <MotionDiv
      key={exc._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card shadow-sm border-0 mb-3"
      style={{
        borderRadius: "12px",
        background: "white",
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        className="card-body p-4"
        style={{ borderLeft: `4px solid ${STATUS_COLORS.PENDING.border}` }}
      >
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div className="flex-grow-1" style={{ minWidth: "0" }}>
            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
              <span
                className="badge fw-medium"
                style={{
                  background: STATUS_COLORS.PENDING.bg,
                  color: STATUS_COLORS.PENDING.text,
                  border: `1px solid ${STATUS_COLORS.PENDING.border}`,
                  fontSize: "0.75rem",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                }}
              >
                <FaClock className="me-1" size={10} />
                Pending Approval
              </span>
            </div>

            <div className="row g-3">
              <div className="col-md-6 col-lg-3">
                <div className="d-flex align-items-center gap-2">
                  <FaUser className="text-muted" size={14} />
                  <div>
                    <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                      Teacher
                    </small>
                    <span className="fw-semibold text-dark small">
                      {exc.createdBy?.name || "Unknown Teacher"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="d-flex align-items-center gap-2">
                  <FaBook className="text-muted" size={14} />
                  <div>
                    <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                      Subject
                    </small>
                    <span className="fw-semibold text-dark small">
                      {exc.slot_id?.subject_id?.name || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="d-flex align-items-center gap-2">
                  <FaCalendarAlt className="text-muted" size={14} />
                  <div>
                    <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                      Exception Date
                    </small>
                    <span className="fw-semibold text-dark small">
                      {formatDate(exc.exceptionDate)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="d-flex align-items-center gap-2">
                  <FaClock className="text-muted" size={14} />
                  <div>
                    <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                      Requested At
                    </small>
                    <span className="fw-semibold text-dark small">
                      {formatDateTime(exc.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {exc.reason && (
              <div className="mt-3 p-2 rounded" style={{ background: "#f8fafc" }}>
                <div className="d-flex align-items-start gap-2">
                  <FaInfoCircle size={14} className="mt-1" style={{ color: "#64748b" }} />
                  <div>
                    <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                      Reason
                    </small>
                    <p className="text-dark mb-0 small">{exc.reason}</p>
                  </div>
                </div>
              </div>
            )}

            {exc.timetable_id && (
              <div className="mt-2">
                <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                  Timetable:{" "}
                  <span className="fw-medium text-dark">
                    {exc.timetable_id.name || "Timetable"} (Sem {exc.timetable_id.semester || "N/A"})
                  </span>
                </small>
              </div>
            )}
          </div>

          <div className="d-flex gap-2 flex-shrink-0">
            <button
              onClick={() => openApproveModal(exc._id)}
              disabled={actionLoading}
              className="btn btn-sm d-flex align-items-center gap-1 fw-semibold px-3 py-2 border-0"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                borderRadius: "8px",
                opacity: actionLoading ? 0.7 : 1,
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
              }}
            >
              <FaCheck size={12} />
              Approve
            </button>
            <button
              onClick={() => openRejectModal(exc._id)}
              disabled={actionLoading}
              className="btn btn-sm d-flex align-items-center gap-1 fw-semibold px-3 py-2 border-0"
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "white",
                borderRadius: "8px",
                opacity: actionLoading ? 0.7 : 1,
                boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
              }}
            >
              <FaTimes size={12} />
              Reject
            </button>
          </div>
        </div>
      </div>
    </MotionDiv>
  );

  const renderHistoryCard = (exc, index, type) => {
    const colors = STATUS_COLORS[exc.status] || (
      type === "approved" ? STATUS_COLORS.APPROVED : STATUS_COLORS.REJECTED
    );
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
        <FaCheck className="me-1" size={10} />
      ) : type === "rejected" ? (
        <FaTimes className="me-1" size={10} />
      ) : (
        <FaUndo className="me-1" size={10} />
      );

    return (
      <MotionDiv
        key={exc._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="card shadow-sm border-0 mb-3"
        style={{
          borderRadius: "12px",
          background: "white",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          className="card-body p-4"
          style={{ borderLeft: `4px solid ${colors.border}` }}
        >
          <div className="d-flex align-items-center gap-2 mb-3">
            <span
              className="badge fw-medium"
              style={{
                background: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                fontSize: "0.75rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
              }}
            >
              {statusIcon}
              {statusLabel}
            </span>
          </div>

          <div className="row g-3">
            <div className="col-md-6 col-lg-3">
              <div className="d-flex align-items-center gap-2">
                <FaUser className="text-muted" size={14} />
                <div>
                  <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                    Teacher
                  </small>
                  <span className="fw-semibold text-dark small">
                    {exc.createdBy?.name || "Unknown Teacher"}
                  </span>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="d-flex align-items-center gap-2">
                <FaBook className="text-muted" size={14} />
                <div>
                  <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                    Subject
                  </small>
                  <span className="fw-semibold text-dark small">
                    {exc.slot_id?.subject_id?.name || "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="d-flex align-items-center gap-2">
                <FaCalendarAlt className="text-muted" size={14} />
                <div>
                  <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                    Exception Date
                  </small>
                  <span className="fw-semibold text-dark small">
                    {formatDate(exc.exceptionDate)}
                  </span>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="d-flex align-items-center gap-2">
                <FaUser className="text-muted" size={14} />
                <div>
                  <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                    {actionLabel}
                  </small>
                  <span className="fw-semibold text-dark small">
                    {actionBy?.name || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {exc.reason && (
            <div className="mt-3 p-2 rounded" style={{ background: "#f8fafc" }}>
              <div className="d-flex align-items-start gap-2">
                <FaInfoCircle size={14} className="mt-1" style={{ color: "#64748b" }} />
                <div>
                  <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                    Reason
                  </small>
                  <p className="text-dark mb-0 small">{exc.reason}</p>
                </div>
              </div>
            </div>
          )}

          {type === "rejected" && exc.rejectionReason && (
            <div className="mt-2 p-2 rounded" style={{ background: "#fef2f2" }}>
              <div className="d-flex align-items-start gap-2">
                <FaTimes size={14} className="mt-1" style={{ color: "#ef4444" }} />
                <div>
                  <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                    Rejection Reason
                  </small>
                  <p className="mb-0 small" style={{ color: "#ef4444" }}>
                    {exc.rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {type === "withdrawn" && exc.withdrawalReason && (
            <div className="mt-2 p-2 rounded" style={{ background: "#f8fafc" }}>
              <div className="d-flex align-items-start gap-2">
                <FaUndo size={14} className="mt-1" style={{ color: "#64748b" }} />
                <div>
                  <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>
                    Withdrawal Reason
                  </small>
                  <p className="mb-0 small" style={{ color: "#64748b" }}>
                    {exc.withdrawalReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-2">
            <small className="text-muted" style={{ fontSize: "0.7rem" }}>
              {statusLabel} At:{" "}
              <span className="fw-medium text-dark">{formatDateTime(actionAt)}</span>
            </small>
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
        background: "linear-gradient(135deg, #f0f4f8 0%, #e8edf2 100%)",
      }}
    >
      <ToastContainer position="top-right" theme="colored" />

      <MotionDiv
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="position-relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--sidebar-bg-gradient-start, #0f3a4a) 0%, var(--sidebar-bg-gradient-end, #0c2d3a) 100%)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
      >
        <div className="p-4 text-white position-relative">
          <div className="d-flex align-items-center gap-3">
            <MotionDiv
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="d-flex align-items-center justify-content-center"
              style={{
                width: "56px",
                height: "56px",
                background:
                  "linear-gradient(135deg, var(--sidebar-accent, #3db5e6) 0%, var(--sidebar-accent-light, #4fc3f7) 100%)",
                borderRadius: "12px",
                fontSize: "1.5rem",
                boxShadow: "0 4px 12px rgba(61, 181, 230, 0.3)",
              }}
            >
              <FaExclamationTriangle />
            </MotionDiv>
            <div>
              <h3 className="fw-bold mb-1" style={{ letterSpacing: "0.5px" }}>
                Exception Approvals
              </h3>
              <p className="mb-0 opacity-75" style={{ fontSize: "0.875rem" }}>
                Review and manage teacher exception requests
              </p>
            </div>
          </div>
        </div>
      </MotionDiv>

      <div className="p-4">
        <div className="card shadow-sm border-0" style={{ borderRadius: "12px", background: "white" }}>
          <div className="card-body p-0">
            <ul className="nav nav-tabs border-0 px-4 pt-3 mb-0" style={{ gap: "4px" }}>
              <li className="nav-item">
                <button
                  onClick={() => setActiveTab("pending")}
                  className="border-0 fw-semibold position-relative"
                  style={{
                    borderRadius: "8px 8px 0 0",
                    color: activeTab === "pending" ? "#0f172a" : "#475569",
                    background: activeTab === "pending" ? "#eff6ff" : "transparent",
                    borderBottom:
                      activeTab === "pending"
                        ? "2px solid #0ea5e9"
                        : "2px solid transparent",
                    opacity: 1,
                    marginBottom: 0,
                    padding: "0.5rem 1rem",
                  }}
                >
                  <FaClock className="me-2" style={{ color: activeTab === "pending" ? "#0ea5e9" : "#64748b" }} />
                  Pending Approvals
                  {pendingRequests.length > 0 && (
                    <span
                      className="badge ms-2 fw-bold"
                      style={{
                        background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                        color: "#78350f",
                        borderRadius: "20px",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.7rem",
                      }}
                    >
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => setActiveTab("history")}
                  className="border-0 fw-semibold position-relative"
                  style={{
                    borderRadius: "8px 8px 0 0",
                    color: activeTab === "history" ? "#0f172a" : "#475569",
                    background: activeTab === "history" ? "#eff6ff" : "transparent",
                    borderBottom:
                      activeTab === "history"
                        ? "2px solid #0ea5e9"
                        : "2px solid transparent",
                    opacity: 1,
                    marginBottom: 0,
                    padding: "0.5rem 1rem",
                  }}
                >
                  <FaExclamationTriangle className="me-2" style={{ color: activeTab === "history" ? "#0ea5e9" : "#64748b" }} />
                  Approval History
                </button>
              </li>
            </ul>

            {/* Search and Filter Bar */}
            <div className="px-4 py-3 border-bottom" style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
              <div className="d-flex flex-wrap gap-3 align-items-end">
                <div className="flex-grow-1 flex-shrink-0" style={{ minWidth: "200px", maxWidth: "250px" }}>
                  <label className="form-label fw-medium text-muted small mb-1">
                    <FaSearch className="me-1" size={12} />
                    Teacher Name
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search teacher..."
                    value={searchTeacher}
                    onChange={(e) => setSearchTeacher(e.target.value)}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "0.5rem 0.75rem",
                    }}
                  />
                </div>

                <div className="flex-grow-1 flex-shrink-0" style={{ minWidth: "200px", maxWidth: "250px" }}>
                  <label className="form-label fw-medium text-muted small mb-1">
                    <FaSearch className="me-1" size={12} />
                    Subject Name
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search subject..."
                    value={searchSubject}
                    onChange={(e) => setSearchSubject(e.target.value)}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "0.5rem 0.75rem",
                    }}
                  />
                </div>

                <div className="flex-grow-1 flex-shrink-0" style={{ minWidth: "200px", maxWidth: "250px" }}>
                  <label className="form-label fw-medium text-muted small mb-1">
                    <FaSearch className="me-1" size={12} />
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

                <div className="flex-shrink-0" style={{ minWidth: "180px" }}>
                  <label className="form-label fw-medium text-muted small mb-1">
                    Status
                  </label>
                  <CustomSelect
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={STATUS_OPTIONS}
                    placeholder="All Status"
                    aria-label="Filter by status"
                  />
                </div>

                {(searchTeacher || searchSubject || searchType || statusFilter || typeFilter) && (
                  <MotionButton
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClearFilters}
                    className="btn btn-sm fw-medium px-3 py-2 border-0"
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      color: "#64748b",
                      borderRadius: "8px",
                      height: "38px",
                    }}
                  >
                    Clear Filters
                  </MotionButton>
                )}
              </div>

              <div className="mt-2 text-muted small">
                Showing records
                {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
              </div>
            </div>

            <div className="p-4">
              <AnimatePresence mode="wait">
                {activeTab === "pending" && (
                  <MotionDiv
                    key="pending"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {loading ? (
                      <div className="text-center py-5">
                        <Loading size="md" text="Loading pending requests..." />
                      </div>
                    ) : pendingRequests.length === 0 ? (
                      <MotionDiv
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-5"
                      >
                        <div
                          className="d-flex align-items-center justify-content-center mx-auto mb-3"
                          style={{
                            width: "80px",
                            height: "80px",
                            background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                            borderRadius: "50%",
                          }}
                        >
                          <FaCheck size={36} style={{ color: "#94a3b8" }} />
                        </div>
                        <h5 className="fw-bold text-dark mb-2">All Caught Up!</h5>
                        <p className="text-muted">
                          No pending exception requests at the moment.
                        </p>
                      </MotionDiv>
                    ) : (
                      pendingRequests.map((exc, index) => renderPendingCard(exc, index))
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
                      <div className="text-center py-5">
                        <Loading size="md" text="Loading history..." />
                      </div>
                    ) : history.approved.length === 0 && history.rejected.length === 0 && history.withdrawn.length === 0 ? (
                      <MotionDiv
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-5"
                      >
                        <div
                          className="d-flex align-items-center justify-content-center mx-auto mb-3"
                          style={{
                            width: "80px",
                            height: "80px",
                            background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                            borderRadius: "50%",
                          }}
                        >
                          <FaExclamationTriangle size={36} style={{ color: "#94a3b8" }} />
                        </div>
                        <h5 className="fw-bold text-dark mb-2">No History Yet</h5>
                        <p className="text-muted">
                          Approved, rejected, and withdrawn exceptions will appear here.
                        </p>
                      </MotionDiv>
                    ) : (
                      <>
                        {history.approved.length > 0 && (
                          <>
                            <h6
                              className="fw-bold text-uppercase mb-3"
                              style={{
                                fontSize: "0.75rem",
                                letterSpacing: "0.5px",
                                color: "#059669",
                              }}
                            >
                              <FaCheck className="me-1" /> Approved Requests (
                              {history.approved.length})
                            </h6>
                            {history.approved.map((exc, index) =>
                              renderHistoryCard(exc, index, "approved"),
                            )}
                          </>
                        )}
                        {history.rejected.length > 0 && (
                          <>
                            <h6
                              className="fw-bold text-uppercase mb-3 mt-4"
                              style={{
                                fontSize: "0.75rem",
                                letterSpacing: "0.5px",
                                color: "#dc2626",
                              }}
                            >
                              <FaTimes className="me-1" /> Rejected Requests (
                              {history.rejected.length})
                            </h6>
                            {history.rejected.map((exc, index) =>
                              renderHistoryCard(exc, index, "rejected"),
                            )}
                          </>
                        )}
                        {history.withdrawn.length > 0 && (
                          <>
                            <h6
                              className="fw-bold text-uppercase mb-3 mt-4"
                              style={{
                                fontSize: "0.75rem",
                                letterSpacing: "0.5px",
                                color: "#475569",
                              }}
                            >
                              <FaUndo className="me-1" /> Withdrawn Requests (
                              {history.withdrawn.length})
                            </h6>
                            {history.withdrawn.map((exc, index) =>
                              renderHistoryCard(exc, index, "withdrawn"),
                            )}
                          </>
                        )}
                      </>
                    )}
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>
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
