import { useContext, useEffect, useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import ApiError from "../../../../components/ApiError";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaCalendarAlt,
  FaPlus,
  FaTrash,
  FaEdit,
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaUpload,
} from "react-icons/fa";
import { motion } from "framer-motion";

/**
 * Format a Date as YYYY-MM-DD using LOCAL date parts (not toISOString which uses UTC).
 */
const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Exception type display names
const EXCEPTION_TYPES = {
  HOLIDAY: "Holiday",
  CANCELLED: "Cancelled Class",
  EXTRA: "Extra/Makup Class",
  RESCHEDULED: "Rescheduled Class",
  ROOM_CHANGE: "Room Change",
  TEACHER_CHANGE: "Teacher Change",
};

// Status colors
const STATUS_COLORS = {
  PENDING: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  APPROVED: { bg: "#e0f2fe", text: "#075985", border: "#bae6fd" },
  REJECTED: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
  COMPLETED: { bg: "#f0f4f8", text: "#475569", border: "#cbd5e1" },
};

export default function ExceptionManagement() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [timetables, setTimetables] = useState([]);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      startDate: toLocalDateStr(startOfMonth),
      endDate: toLocalDateStr(endOfMonth),
    };
  });
  const [pendingCount, setPendingCount] = useState(0);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER") return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH TIMETABLES ================= */
  const fetchTimetables = async () => {
    try {
      const res = await api.get("/timetable");
      setTimetables(res.data.timetables || []);
      if (res.data.timetables?.length > 0 && !selectedTimetable) {
        setSelectedTimetable(res.data.timetables[0]);
      }
    } catch (err) {
      console.error("Failed to fetch timetables:", err);
    }
  };

  /* ================= FETCH EXCEPTIONS ================= */
  const fetchExceptions = useCallback(async () => {
    if (!selectedTimetable) return;

    try {
      setLoading(true);
      setError(null);

      const res = await api.get(
        `/timetable/${selectedTimetable._id}/exceptions`,
        {
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        },
      );

      const responseData = res.data?.data || res.data || {};
      const exceptionsList = responseData.exceptions || [];

      setExceptions(exceptionsList);

      const pending =
        exceptionsList.filter((e) => e.status === "PENDING").length || 0;
      setPendingCount(pending);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to load exceptions";
      setError({ message: errorMsg, statusCode: err.response?.status });
    } finally {
      setLoading(false);
    }
  }, [selectedTimetable, dateRange]);

  useEffect(() => {
    fetchTimetables();
  }, []);

  useEffect(() => {
    if (selectedTimetable) {
      fetchExceptions();
    }
  }, [selectedTimetable, dateRange, fetchExceptions]);

  /* ================= DELETE EXCEPTION ================= */
  const handleDelete = async (exceptionId) => {
    if (!window.confirm("Are you sure you want to delete this exception?")) {
      return;
    }

    try {
      await api.delete(`/timetable/exceptions/${exceptionId}`);
      toast.success("Exception deleted successfully", {
        position: "top-right",
        autoClose: 3000,
      });
      fetchExceptions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete exception", {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  /* ================= APPROVE EXCEPTION ================= */
  const handleApprove = async (exceptionId) => {
    try {
      await api.put(`/timetable/exceptions/${exceptionId}/approve`);
      toast.success("Exception approved successfully", {
        position: "top-right",
        autoClose: 3000,
      });
      fetchExceptions();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to approve exception",
        {
          position: "top-right",
          autoClose: 5000,
        },
      );
    }
  };

  /* ================= REJECT EXCEPTION ================= */
  const handleReject = async (exceptionId) => {
    const reason = prompt("Enter rejection reason (optional):");
    try {
      await api.put(`/timetable/exceptions/${exceptionId}/reject`, {
        rejectionReason: reason || "No reason provided",
      });
      toast.success("Exception rejected", {
        position: "top-right",
        autoClose: 3000,
      });
      fetchExceptions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject exception", {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  /* ================= NAVIGATION ================= */
  const goToPreviousMonth = () => {
    const start = new Date(dateRange.startDate.replace(/-/g, "/"));
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
    const end = new Date(dateRange.endDate.replace(/-/g, "/"));
    end.setMonth(end.getMonth() - 1);
    end.setDate(0);
    setDateRange({
      startDate: toLocalDateStr(start),
      endDate: toLocalDateStr(end),
    });
  };

  const goToNextMonth = () => {
    const start = new Date(dateRange.startDate.replace(/-/g, "/"));
    start.setMonth(start.getMonth() + 1);
    start.setDate(1);
    const end = new Date(dateRange.endDate.replace(/-/g, "/"));
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    setDateRange({
      startDate: toLocalDateStr(start),
      endDate: toLocalDateStr(end),
    });
  };

  /* ================= LOADING ================= */
  if (loading && exceptions.length === 0) {
    return (
      <Loading
        fullScreen
        size="lg"
        text="Loading Exceptions..."
        color="primary"
      />
    );
  }

  /* ================= ERROR STATE ================= */
  if (error && exceptions.length === 0) {
    return (
      <ApiError
        title="Exception Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        onRetry={fetchExceptions}
        onGoBack={() => navigate("/teacher/dashboard")}
      />
    );
  }

  return (
    <div
      className="container-fluid p-0"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f4f8 0%, #e8edf2 100%)",
      }}
    >
      <ToastContainer position="top-right" theme="colored" />

      {/* ================= HEADER ================= */}
      <motion.div
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
        {/* Background Pattern */}
        <div
          className="position-absolute top-0 end-0"
          style={{
            width: "400px",
            height: "100%",
            opacity: 0.03,
            background:
              "radial-gradient(circle at 70% 50%, var(--sidebar-accent, #3db5e6) 0%, transparent 70%)",
          }}
        />

        <div className="p-4 text-white position-relative">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
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
              </motion.div>
              <div>
                <h3 className="fw-bold mb-1" style={{ letterSpacing: "0.5px" }}>
                  Exception Management
                </h3>
                <p className="mb-0 opacity-75" style={{ fontSize: "0.875rem" }}>
                  Manage holidays, cancellations, and special events
                </p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              {pendingCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="badge fw-medium px-3 py-2"
                  style={{
                    background:
                      "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                    color: "#78350f",
                    boxShadow: "0 2px 8px rgba(251, 191, 36, 0.3)",
                  }}
                >
                  <FaExclamationTriangle className="me-1" />
                  {pendingCount} Pending
                </motion.span>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/timetable/create/exceptions")}
                className="btn btn-sm fw-bold px-3 py-2 border-0"
                style={{
                  background:
                    "linear-gradient(135deg, var(--sidebar-accent, #3db5e6) 0%, var(--sidebar-accent-light, #4fc3f7) 100%)",
                  color: "white",
                  boxShadow: "0 2px 8px rgba(61, 181, 230, 0.3)",
                  transition: "all 0.2s ease",
                }}
              >
                <FaPlus className="me-1" /> Add Exception
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowBulkModal(true)}
                className="btn btn-sm px-3 py-2 border-0"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "white",
                  backdropFilter: "blur(10px)",
                  transition: "all 0.2s ease",
                }}
              >
                <FaUpload className="me-1" /> Bulk Upload
              </motion.button>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div
          className="px-4 py-3"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            {/* Timetable Selector */}
            <div className="d-flex align-items-center gap-2">
              <label className="fw-medium text-muted small mb-0">
                <FaCalendarAlt
                  className="me-1"
                  style={{ color: "var(--sidebar-accent, #3db5e6)" }}
                />
                Timetable:
              </label>
              <select
                className="form-select form-select-sm fw-medium border-0"
                style={{
                  width: "auto",
                  minWidth: "250px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
                value={selectedTimetable?._id || ""}
                onChange={(e) => {
                  const tt = timetables.find((t) => t._id === e.target.value);
                  setSelectedTimetable(tt);
                }}
              >
                {timetables.map((tt) => (
                  <option key={tt._id} value={tt._id}>
                    {tt.name} (Sem {tt.semester})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Navigation */}
            <div className="d-flex align-items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToPreviousMonth}
                className="btn btn-sm d-flex align-items-center justify-content-center"
                style={{
                  width: "32px",
                  height: "32px",
                  padding: 0,
                  borderRadius: "8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.2s ease",
                }}
              >
                <FaChevronLeft style={{ fontSize: "0.75rem" }} />
              </motion.button>
              <span
                className="text-dark fw-semibold small px-3 py-2 rounded"
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  minWidth: "150px",
                  textAlign: "center",
                  border: "1px solid #e2e8f0",
                }}
              >
                {new Date(dateRange.startDate).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToNextMonth}
                className="btn btn-sm d-flex align-items-center justify-content-center"
                style={{
                  width: "32px",
                  height: "32px",
                  padding: 0,
                  borderRadius: "8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.2s ease",
                }}
              >
                <FaChevronRight style={{ fontSize: "0.75rem" }} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ================= EXCEPTIONS LIST ================= */}
      <div className="p-4">
        {exceptions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card shadow-lg border-0 text-center p-5"
            style={{
              background: "white",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              className="d-flex align-items-center justify-content-center mx-auto mb-4"
              style={{
                width: "80px",
                height: "80px",
                background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                borderRadius: "50%",
              }}
            >
              <FaExclamationTriangle size={36} style={{ color: "#94a3b8" }} />
            </div>
            <h5 className="fw-bold text-dark mb-2">No Exceptions Found</h5>
            <p className="text-muted mb-4">
              No holidays, cancellations, or special events for this period.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/timetable/create/exceptions")}
              className="btn fw-bold px-4 py-2"
              style={{
                background:
                  "linear-gradient(135deg, var(--sidebar-accent, #3db5e6) 0%, var(--sidebar-accent-light, #4fc3f7) 100%)",
                color: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(61, 181, 230, 0.3)",
              }}
            >
              <FaPlus className="me-1" /> Add First Exception
            </motion.button>
          </motion.div>
        ) : (
          <div className="row g-3">
            {exceptions.map((exc, index) => {
              const statusColors =
                STATUS_COLORS[exc.status] || STATUS_COLORS.PENDING;

              return (
                <motion.div
                  key={exc._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="card shadow-sm border-0"
                    style={{
                      borderRadius: "12px",
                      overflow: "hidden",
                      background: "white",
                      border: "1px solid #e2e8f0",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Status Indicator Bar */}
                    <div
                      style={{
                        height: "4px",
                        background: `linear-gradient(90deg, ${statusColors.border} 0%, ${statusColors.bg} 100%)`,
                      }}
                    />

                    <div className="card-body p-3">
                      <div className="d-flex align-items-start justify-content-between gap-3">
                        <div className="flex-grow-1">
                          {/* Header with Type and Status */}
                          <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                            <div
                              className="d-flex align-items-center gap-2 px-2 py-1 rounded"
                              style={{
                                background: `${statusColors.bg}`,
                                border: `1px solid ${statusColors.border}`,
                              }}
                            >
                              <FaExclamationTriangle
                                size={12}
                                style={{ color: statusColors.text }}
                              />
                              <h6
                                className="fw-bold mb-0 small"
                                style={{ color: statusColors.text }}
                              >
                                {EXCEPTION_TYPES[exc.type] || exc.type}
                              </h6>
                            </div>
                            <span
                              className="badge fw-medium"
                              style={{
                                backgroundColor: statusColors.bg,
                                color: statusColors.text,
                                border: `1px solid ${statusColors.border}`,
                                fontSize: "0.7rem",
                                padding: "0.35rem 0.65rem",
                                borderRadius: "6px",
                              }}
                            >
                              {exc.status === "PENDING" && (
                                <>
                                  <FaExclamationTriangle
                                    className="me-1"
                                    size={10}
                                  />
                                </>
                              )}
                              {exc.status === "APPROVED" && (
                                <>
                                  <FaCheck className="me-1" size={10} />
                                </>
                              )}
                              {exc.status === "REJECTED" && (
                                <>
                                  <FaTimes className="me-1" size={10} />
                                </>
                              )}
                              {exc.status}
                            </span>
                          </div>

                          {/* Date */}
                          <div className="d-flex align-items-center mb-2">
                            <FaCalendarAlt
                              className="me-2"
                              size={14}
                              style={{
                                color: "var(--sidebar-accent, #3db5e6)",
                              }}
                            />
                            <p className="small text-dark mb-0 fw-medium">
                              {new Date(exc.exceptionDate).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )}
                            </p>
                          </div>

                          {/* Reason */}
                          <div className="d-flex align-items-start mb-2">
                            <FaInfoCircle
                              className="me-2 mt-1"
                              size={14}
                              style={{ color: "#64748b" }}
                            />
                            <p className="small text-dark mb-0">{exc.reason}</p>
                          </div>

                          {/* Rescheduled Info */}
                          {exc.rescheduledTo && (
                            <div className="d-flex align-items-center mb-2">
                              <FaChevronRight
                                className="me-2"
                                size={14}
                                style={{ color: "#3b82f6" }}
                              />
                              <p
                                className="small mb-0"
                                style={{ color: "#3b82f6" }}
                              >
                                Rescheduled to:{" "}
                                <span className="fw-semibold">
                                  {new Date(
                                    exc.rescheduledTo,
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </p>
                            </div>
                          )}

                          {/* Approved/Rejected Info */}
                          {exc.status === "APPROVED" && exc.approvedAt && (
                            <div className="d-flex align-items-center">
                              <FaCheck
                                className="me-2"
                                size={14}
                                style={{ color: "#3db5e6" }}
                              />
                              <p
                                className="small mb-0"
                                style={{ color: "#075985" }}
                              >
                                Approved on{" "}
                                <span className="fw-semibold">
                                  {new Date(exc.approvedAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </span>
                              </p>
                            </div>
                          )}
                          {exc.status === "REJECTED" && exc.rejectionReason && (
                            <div className="d-flex align-items-center">
                              <FaTimes
                                className="me-2"
                                size={14}
                                style={{ color: "#ef4444" }}
                              />
                              <p
                                className="small mb-0"
                                style={{ color: "#ef4444" }}
                              >
                                Reason: {exc.rejectionReason}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="d-flex flex-column gap-2">
                          {/* Approve/Reject for PENDING exceptions */}
                          {exc.status === "PENDING" && (
                            <div className="d-flex gap-1">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleApprove(exc._id)}
                                className="btn btn-sm d-flex align-items-center justify-content-center"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  padding: 0,
                                  borderRadius: "8px",
                                  background:
                                    "linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%)",
                                  border: "none",
                                  color: "white",
                                  boxShadow:
                                    "0 2px 4px rgba(61, 181, 230, 0.3)",
                                }}
                                title="Approve"
                              >
                                <FaCheck size={12} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleReject(exc._id)}
                                className="btn btn-sm d-flex align-items-center justify-content-center"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  padding: 0,
                                  borderRadius: "8px",
                                  background:
                                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                  border: "none",
                                  color: "white",
                                  boxShadow:
                                    "0 2px 4px rgba(245, 158, 11, 0.2)",
                                }}
                                title="Reject"
                              >
                                <FaTimes size={12} />
                              </motion.button>
                            </div>
                          )}

                          {/* Edit/Delete for all exceptions */}
                          <div className="d-flex gap-1">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                navigate("/timetable/create/exceptions", {
                                  state: { editException: exc },
                                });
                              }}
                              className="btn btn-sm d-flex align-items-center justify-content-center"
                              style={{
                                width: "32px",
                                height: "32px",
                                padding: 0,
                                borderRadius: "8px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                color: "var(--sidebar-accent, #3db5e6)",
                                transition: "all 0.2s ease",
                              }}
                              title="Edit"
                            >
                              <FaEdit size={12} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDelete(exc._id)}
                              className="btn btn-sm d-flex align-items-center justify-content-center"
                              style={{
                                width: "32px",
                                height: "32px",
                                padding: 0,
                                borderRadius: "8px",
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#ef4444",
                                transition: "all 0.2s ease",
                              }}
                              title="Delete"
                            >
                              <FaTrash size={12} />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= BULK UPLOAD MODAL ================= */}
      {showBulkModal && (
        <BulkExceptionModal
          timetableId={selectedTimetable?._id}
          onClose={() => setShowBulkModal(false)}
          onSuccess={fetchExceptions}
        />
      )}
    </div>
  );
}

/* ================= BULK UPLOAD MODAL ================= */
function BulkExceptionModal({ timetableId, onClose, onSuccess }) {
  const [bulkText, setBulkText] = useState("");
  const [exceptionType, setExceptionType] = useState("HOLIDAY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const lines = bulkText
        .split("\n")
        .filter((l) => l.trim())
        .slice(1);

      const exceptions = lines.map((line) => {
        const [date, type, reason] = line.split(",").map((s) => s.trim());
        return {
          exceptionDate: date,
          type: type || exceptionType,
          reason: reason || "Bulk uploaded exception",
        };
      });

      await api.post(`/timetable/${timetableId}/exceptions/bulk`, {
        exceptions,
      });

      toast.success("Bulk exceptions uploaded successfully", {
        position: "top-right",
        autoClose: 3000,
      });
      onSuccess();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to upload bulk exceptions",
        {
          position: "top-right",
          autoClose: 5000,
        },
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="modal-dialog modal-lg modal-dialog-centered"
      >
        <div
          className="modal-content border-0 shadow-lg"
          style={{
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          {/* Modal Header */}
          <div
            className="modal-header border-0 text-white p-3"
            style={{
              background:
                "linear-gradient(135deg, var(--sidebar-bg-gradient-start, #0f3a4a) 0%, var(--sidebar-bg-gradient-end, #0c2d3a) 100%)",
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: "40px",
                  height: "40px",
                  background:
                    "linear-gradient(135deg, var(--sidebar-accent, #3db5e6) 0%, var(--sidebar-accent-light, #4fc3f7) 100%)",
                  borderRadius: "10px",
                }}
              >
                <FaUpload />
              </div>
              <h5 className="modal-title fw-bold mb-0">
                Bulk Upload Exceptions
              </h5>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white opacity-75"
              onClick={onClose}
              style={{ filter: "brightness(0) invert(1)" }}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4" style={{ background: "#f8fafc" }}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="alert alert-danger d-flex align-items-center mb-3 border-0"
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    color: "#991b1b",
                  }}
                >
                  <FaInfoCircle className="me-2" />
                  {error}
                </motion.div>
              )}

              <div className="mb-3">
                <label className="form-label fw-bold text-dark mb-2">
                  Default Exception Type
                </label>
                <select
                  className="form-select border-0"
                  value={exceptionType}
                  onChange={(e) => setExceptionType(e.target.value)}
                  style={{
                    background: "white",
                    borderRadius: "10px",
                    padding: "0.75rem 1rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {Object.entries(EXCEPTION_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold text-dark mb-2">
                  CSV Data <span className="text-danger">*</span>
                </label>
                <small
                  className="text-muted d-block mb-2"
                  style={{ fontSize: "0.8rem" }}
                >
                  Format: date,type,reason (one per line, first line is header)
                  <br />
                  Example: 2024-03-15,HOLIDAY,Public Holiday
                </small>
                <textarea
                  className="form-control border-0"
                  rows="10"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`date,type,reason\n2024-03-15,HOLIDAY,Public Holiday\n2024-03-18,CANCELLED,Teacher absent`}
                  required
                  style={{
                    background: "white",
                    borderRadius: "10px",
                    padding: "1rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    border: "1px solid #e2e8f0",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                />
              </div>
            </div>

            <div
              className="modal-footer border-0 d-flex gap-2 p-3"
              style={{ background: "white" }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className="btn px-4 py-2 fw-medium"
                onClick={onClose}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  borderRadius: "8px",
                }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="btn px-4 py-2 fw-bold text-white"
                disabled={submitting}
                style={{
                  background:
                    "linear-gradient(135deg, var(--sidebar-accent, #3db5e6) 0%, var(--sidebar-accent-light, #4fc3f7) 100%)",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(61, 181, 230, 0.3)",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                <FaUpload className="me-1" />
                {submitting ? "Uploading..." : "Upload"}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
