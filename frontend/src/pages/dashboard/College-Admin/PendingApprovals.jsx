import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Pagination from "../../../components/Pagination";
import Breadcrumb from "../../../components/Breadcrumb";
import ConfirmModal from "../../../components/ConfirmModal";
import { toast } from "react-toastify";
import useRole from "../../../hooks/useRole";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

import {
  FaSearch,
  FaClock,
  FaGraduationCap,
  FaBuilding,
  FaBookOpen,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaSyncAlt,
  FaCheck,
  FaTimes,
  FaEye,
  FaCheckDouble,
  FaSpinner,
  FaTimesCircle,
  FaCheckCircle,
  FaUserCheck,
  FaUser,
  FaInfoCircle,
  FaCopy,
  FaEdit,
} from "react-icons/fa";

const PAGE_SIZE = 5;

export default function PendingApprovals({ admissionOfficerMode = false }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { canEdit } = useRole();
  const canApprove = canEdit('students');

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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [pendingApproveId, setPendingApproveId] = useState(null);
  const [parentAccountDetails, setParentAccountDetails] = useState(null);
  const [showParentDetailsModal, setShowParentDetailsModal] = useState(false);
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  const [validDivisions, setValidDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [assigningDivision, setAssigningDivision] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [assigningStudentId, setAssigningStudentId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    byDepartment: {},
    byCourse: {},
    byYear: {},
  });

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (!admissionOfficerMode && user.role !== "COLLEGE_ADMIN" && user.role !== "PRINCIPAL") {
    return <Navigate to="/dashboard" />;
  }

  /* ================= FETCH PENDING STUDENTS ================= */
  const fetchPendingStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/students/registered");

      let data;
      if (res.data.data) {
        data = res.data.data;
      } else if (Array.isArray(res.data)) {
        data = res.data;
      } else {
        data = [];
      }

      // Filter only PENDING status students
      const pendingStudents = data.filter((s) => s.status === "PENDING");
      setStudents(pendingStudents);

      calculateStats(pendingStudents);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load pending students.";

      logger.error("Error fetching pending students:", statusCode, errorCode);

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

  /* ================= CALCULATE STATS ================= */
  const calculateStats = (studentList) => {
    const byDepartment = {};
    const byCourse = {};
    const byYear = {};

    studentList.forEach((student) => {
      const dept = student.department_id?.name || "Unknown";
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;

      const course = student.course_id?.name || "Unknown";
      byCourse[course] = (byCourse[course] || 0) + 1;

      const year = student.admissionYear || "Unknown";
      byYear[year] = (byYear[year] || 0) + 1;
    });

    setStats({
      total: studentList.length,
      byDepartment,
      byCourse,
      byYear,
    });
  };

  /* ================= SELECTION HANDLERS ================= */
  const toggleStudent = (id) => {
    const next = new Set(selectedStudents);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedStudents(next);
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === paginatedStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(paginatedStudents.map((s) => s._id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedStudents.size === 0) {
      toast.warning("No students selected");
      return;
    }

    const studentsWithoutDivision = students.filter(
      (s) => selectedStudents.has(s._id) && !s.division
    );
    if (studentsWithoutDivision.length > 0) {
      toast.warning(
        `${studentsWithoutDivision.length} selected student(s) do not have a division assigned. Please assign divisions before approving.`,
      );
      return;
    }

    setShowBulkApproveModal(true);
  };

  const executeBulkApprove = async () => {
    setBulkApproving(true);
    try {
      const { data } = await api.post("/students/bulk-approve", {
        studentIds: [...selectedStudents],
      });

      toast.success(`${data.approved.length} students approved`);

      // Show parent account creation info for bulk approvals
      const studentsWithParents = data.approved.filter(student => student.parentAccounts?.created > 0);
      if (studentsWithParents.length > 0) {
        // Collect all parent accounts from bulk approval
        const allParentAccounts = [];
        studentsWithParents.forEach(student => {
          student.parentAccounts.parents.forEach(parent => {
            allParentAccounts.push({
              ...parent,
              studentName: student.fullName
            });
          });
        });

        // Show modal with all parent account details
        setParentAccountDetails({
          created: allParentAccounts.length,
          parents: allParentAccounts,
          isBulk: true
        });
        setShowParentDetailsModal(true);

        // Also show summary toast
        toast.success(
          `👨‍👩‍👧 ${allParentAccounts.length} parent account(s) created for ${studentsWithParents.length} student(s)!`,
          {
            position: "top-center",
            autoClose: 5000,
          }
        );
      }

      if (data.failed.length > 0) {
        toast.warning(
          `${data.failed.length} failed: ` +
            data.failed
              .map((f) => `${f.fullName || f.studentId} — ${f.reason}`)
              .join("; "),
          { autoClose: 12000 },
        );
      }
      setSelectedStudents(new Set());
      fetchPendingStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk approve failed");
    } finally {
      setBulkApproving(false);
    }
  };

  useEffect(() => {
    fetchPendingStudents();
  }, []);

  /* ================= APPROVE HANDLER ================= */
  const handleApprove = (studentId) => {
    setPendingApproveId(studentId);
    setShowApproveModal(true);
  };

  const executeApprove = async () => {
    if (!pendingApproveId) return;

    setProcessingId(pendingApproveId);
    try {
      const response = await api.put(`/students/${pendingApproveId}/approve`);

      // Show success message
      const approvalMsg =
        response.data.emailDelivered === false
          ? "Admission offer made. Email delivery failed - share credentials manually."
          : response.data.message || "Student approved successfully!";
      toast.success(approvalMsg, {
        position: "top-right",
        autoClose: response.data.emailDelivered ? 3000 : 5000,
      });

      if (response.data.temporaryPassword) {
        toast.info(
          `Temporary password: ${response.data.temporaryPassword} (share with student)`,
          { position: "top-right", autoClose: 8000 },
        );
      }

      // Show parent account creation info if any parents were created
      if (response.data.parentAccounts && response.data.parentAccounts.created > 0) {
        // Show modal with parent account details
        setParentAccountDetails(response.data.parentAccounts);
        setShowParentDetailsModal(true);

        // Also show toast notification
        toast.success(
          `👨‍👩‍👧 ${response.data.parentAccounts.created} parent account(s) created successfully!`,
          {
            position: "top-center",
            autoClose: 5000,
          }
        );
      }

      await fetchPendingStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve student", {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setShowApproveModal(false);
      setProcessingId(null);
      setPendingApproveId(null);
    }
  };

  /* ================= REJECT HANDLER ================= */
  const handleRejectClick = (studentId) => {
    setSelectedStudentId(studentId);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast.warning("Please provide a rejection reason");
      return;
    }

    setProcessingId(selectedStudentId);
    try {
      await api.put(`/students/${selectedStudentId}/reject`, {
        reason: rejectReason,
        allowReapply: true,
      });
      toast.success("Student rejected. Notification email sent to student.", {
        position: "top-right",
        autoClose: 3000,
      });
      setShowRejectModal(false);
      fetchPendingStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject student", {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setProcessingId(null);
      setSelectedStudentId(null);
    }
  };

  /* ================= DIVISION ASSIGNMENT HANDLERS ================= */
  const handleOpenDivisionModal = async (studentId) => {
    setShowDivisionModal(true);
    setAssigningStudentId(studentId);
    setSelectedDivision("");
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
  };

  const handleAssignDivisionFromPending = async () => {
    if (!assigningStudentId || !selectedDivision) return;
    try {
      setAssigningDivision(true);
      await api.put(`/students/${assigningStudentId}`, {
        division: selectedDivision,
      });
      toast.success("Division assigned successfully", {
        position: "top-right",
        autoClose: 3000,
      });
      setShowDivisionModal(false);
      fetchPendingStudents();
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
  };

  /* ================= SEARCH ================= */
  const filteredStudents = useMemo(() => {
    return students.filter((s) =>
      `${s.fullName} ${s.email} ${s.department_id?.name || ""} ${s.course_id?.name || ""} ${s.admissionYear || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [students, search]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const paginatedStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  /* ================= HELPERS (display only) ================= */
  const getInitials = (name = "") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <ApiError
        title="Pending Approvals Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchPendingStudents}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading pending approvals..." />;
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={admissionOfficerMode
          ? [
              { label: "Dashboard", path: "/dashboard/admission" },
              { label: "Admissions", path: "/admission/applications" },
              { label: "Pending Applications" },
            ]
          : [
              { label: "Dashboard", path: "/dashboard" },
              { label: "Students", path: "/students" },
              { label: "Pending Approvals" },
            ]
        }
      />

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaClock />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Pending Student Approvals</h1>
            <p className="erp-page-subtitle">
              Review and approve or reject student admission applications
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-refresh"
          onClick={fetchPendingStudents}
          title="Refresh list"
          aria-label="Refresh list"
        >
          <FaSyncAlt />
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="stats-grid">
        <div className="stat-card stat-card--accent">
          <div className="stat-card-icon">
            <FaClock />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Pending Approval</div>
            <div className="stat-card-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--purple">
            <FaBuilding />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Departments</div>
            <div className="stat-card-value">
              {Object.keys(stats.byDepartment).length}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--pink">
            <FaBookOpen />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Courses</div>
            <div className="stat-card-value">
              {Object.keys(stats.byCourse).length}
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS + BULK ACTIONS */}
      <div className="erp-card erp-toolbar-card">
        <div className="erp-card-body erp-toolbar">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, department, or course…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search pending students"
            />
          </div>

          {filteredStudents.length > 0 && (
            <div className="toolbar-selection">
              <label className="select-all-label">
                <input
                  type="checkbox"
                  checked={
                    paginatedStudents.length > 0 &&
                    selectedStudents.size === paginatedStudents.length
                  }
                  onChange={toggleSelectAll}
                  className="select-all-checkbox"
                />
                <span>
                  Select all on page{" "}
                  <span className="select-all-count">
                    ({paginatedStudents.length})
                  </span>
                </span>
              </label>

              {selectedStudents.size > 0 && canEdit('students') && (
                <button
                  className="btn btn-bulk-approve"
                  onClick={handleBulkApprove}
                  disabled={bulkApproving}
                >
                  {bulkApproving ? (
                    <>
                      <FaSpinner className="spin" /> Approving…
                    </>
                  ) : (
                    <>
                      <FaCheckDouble /> Approve Selected ({selectedStudents.size})
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* STUDENTS TABLE */}
      <div className="erp-card">
        <div className="erp-card-header">
          <h3>
            <FaClock className="erp-card-icon" />
            Awaiting Your Review
          </h3>
          <span className="record-count">
            {filteredStudents.length}{" "}
            {filteredStudents.length === 1 ? "Student" : "Students"} Pending
          </span>
        </div>

        <div className="erp-card-body erp-card-body--flush">
          {paginatedStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaCheckCircle />
              </div>
              <h3>No Pending Approvals</h3>
              <p className="empty-description">
                {search
                  ? "No pending students match your search criteria."
                  : "All caught up! No student applications awaiting approval."}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th className="th-checkbox">
                      <input
                        type="checkbox"
                        checked={
                          paginatedStudents.length > 0 &&
                          selectedStudents.size === paginatedStudents.length
                        }
                        onChange={toggleSelectAll}
                        className="row-checkbox"
                        readOnly
                      />
                    </th>
                    <th className="th-student">
                      <FaGraduationCap className="header-icon" /> Student Name
                    </th>
                    <th className="th-department">
                      <FaBuilding className="header-icon" /> Department
                    </th>
                    <th className="th-year">
                      <FaCalendarAlt className="header-icon" /> Admission Year
                    </th>
                    <th className="th-status">Status</th>
                    <th className="th-actions text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student) => (
                    <tr key={student._id} className="table-row">
                      <td className="cell-checkbox" data-label="">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student._id)}
                          onChange={() => toggleStudent(student._id)}
                          className="row-checkbox"
                        />
                      </td>
                      <td className="cell-student" data-label="Student">
                        <div className="student-info">
                          <span className="student-avatar" aria-hidden="true">
                            {getInitials(student.fullName)}
                          </span>
                          <div className="student-info-text">
                            <span className="student-name-cell">
                              {student.fullName}
                            </span>
                            <span className="student-email">{student.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="cell-department" data-label="Department">
                        <span className="department-name">
                          {student.department_id?.name || student.department_id?.code || (typeof student.department_id === "string" ? student.department_id : student.course_id?.name || "N/A")}
                        </span>
                      </td>
                      <td className="cell-year" data-label="Year">
                        <span className="badge badge-graduation-year">
                          <FaCalendarAlt className="badge-icon" />
                          {student.admissionYear || "N/A"}
                        </span>
                      </td>
                      <td className="cell-status" data-label="Status">
                        <span className="badge badge-pending">
                          <FaClock className="badge-icon" />
                          PENDING
                        </span>
                        {!student.division && (
                          <span
                            className="badge badge-warning"
                            title="Division not assigned"
                          >
                            <FaExclamationTriangle className="badge-icon" />
                            No division
                          </span>
                        )}
                      </td>
                      <td className="cell-actions" data-label="Actions">
                        <div className="action-buttons">
                          <button
                            className="btn btn-action btn-view-student"
                            onClick={() =>
                              navigate(`/college/view-student/${student._id}`)
                            }
                            title="View Student Details"
                          >
                            <FaEye />
                            <span className="btn-text">View</span>
                          </button>
                          {canEdit('students') && (
                            <>
                              <button
                                className="btn btn-action btn-approve"
                                onClick={() => handleApprove(student._id)}
                                disabled={processingId === student._id}
                                title="Approve Student"
                              >
                                {processingId === student._id ? (
                                  <FaSpinner className="spin" />
                                ) : (
                                  <FaCheck />
                                )}
                                <span className="btn-text">
                                  {processingId === student._id
                                    ? "Processing…"
                                    : "Approve"}
                                </span>
                              </button>
                              <button
                                className="btn btn-action btn-reject"
                                onClick={() => handleRejectClick(student._id)}
                                disabled={processingId === student._id}
                                title="Reject Student"
                              >
                                {processingId === student._id ? (
                                  <FaSpinner className="spin" />
                                ) : (
                                  <FaTimes />
                                )}
                                <span className="btn-text">
                                  {processingId === student._id
                                    ? "Processing…"
                                    : "Reject"}
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="erp-pagination">
              <Pagination
                page={page}
                totalPages={totalPages}
                setPage={setPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM APPROVE MODAL */}
      <ConfirmModal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setPendingApproveId(null);
        }}
        onConfirm={executeApprove}
        title="Approve Student"
        message="Are you sure you want to approve this student? An approval email will be sent to them."
        type="success"
        confirmText="Approve"
        cancelText="Cancel"
        isLoading={processingId === pendingApproveId}
      />

      {/* CONFIRM BULK APPROVE MODAL */}
      <ConfirmModal
        isOpen={showBulkApproveModal}
        onClose={() => setShowBulkApproveModal(false)}
        onConfirm={executeBulkApprove}
        title="Bulk Approve Students"
        message={`Are you sure you want to approve ${selectedStudents.size} student(s)? Approval emails will be sent to all selected students.`}
        type="success"
        confirmText={`Approve ${selectedStudents.size} Students`}
        cancelText="Cancel"
        isLoading={bulkApproving}
      />

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowRejectModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header modal-header--danger">
              <h3>
                <FaTimesCircle className="modal-header-icon" />
                Reject Student Application
              </h3>
              <button
                className="btn-close"
                onClick={() => setShowRejectModal(false)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-lead">
                Please provide a reason for rejection. The student will receive
                this information via email.
              </p>
              <div className="form-group">
                <label className="form-label">Rejection Reason *</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="E.g., Incomplete documents, does not meet eligibility criteria, etc."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                />
              </div>
              <label className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="allowReapply"
                  defaultChecked
                />
                <span>Allow student to reapply after addressing issues</span>
              </label>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || !!processingId}
              >
                {processingId ? (
                  <>
                    <FaSpinner className="spin" /> Processing…
                  </>
                ) : (
                  "Confirm Rejection"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIVISION ASSIGNMENT MODAL */}
      {showDivisionModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDivisionModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header modal-header--info">
              <h3>
                <FaEdit className="modal-header-icon" />
                Assign Division
              </h3>
              <button
                className="btn-close"
                onClick={() => setShowDivisionModal(false)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-lead">
                Select a valid division for this student. Only divisions matching the student's academic context are shown.
              </p>
              {loadingDivisions ? (
                <div className="division-loading">
                  <div className="division-spinner" />
                  <span>Loading valid divisions...</span>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Division</label>
                  <select
                    className="form-control division-select"
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    disabled={validDivisions.length === 0}
                  >
                    <option value="">-- Select Division --</option>
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
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDivisionModal(false)}
                disabled={assigningDivision}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAssignDivisionFromPending}
                disabled={assigningDivision || loadingDivisions || !selectedDivision}
              >
                {assigningDivision ? (
                  <>
                    <FaSpinner className="spin" /> Saving…
                  </>
                ) : (
                  "Save Division"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PARENT ACCOUNT DETAILS MODAL */}
      {showParentDetailsModal && parentAccountDetails && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowParentDetailsModal(false);
            setParentAccountDetails(null);
          }}
        >
          <div
            className="modal-content modal-content--lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header modal-header--success">
              <h3>
                <FaUserCheck className="modal-header-icon" />
                Parent Accounts Created
              </h3>
              <button
                className="btn-close"
                onClick={() => {
                  setShowParentDetailsModal(false);
                  setParentAccountDetails(null);
                }}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
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
                      {parent.studentName && (
                        <span className="parent-account-student">
                          {parent.studentName}
                        </span>
                      )}
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
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowParentDetailsModal(false);
                  setParentAccountDetails(null);
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  // Copy all parent details to clipboard
                  const details = parentAccountDetails.parents
                    .map(p => `${p.relation.toUpperCase()}: ${p.email} - Password: ${p.tempPassword}`)
                    .join('\n');
                  navigator.clipboard.writeText(details);
                  toast.success("Parent account details copied to clipboard!");
                }}
              >
                <FaCopy />
                Copy All Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@500;600;700&display=swap');

        :root {
          --erp-navy-deep: #0f3a4a;
          --erp-navy: #1a4b6d;
          --erp-navy-light: #1a5263;
          --erp-blue: #3db5e6;
          --erp-purple-1: #667eea;
          --erp-purple-2: #764ba2;
          --erp-pink-1: #f093fb;
          --erp-pink-2: #f5576c;
          --erp-green-1: #059669;
          --erp-green-2: #047857;
          --erp-red-1: #ef4444;
          --erp-red-2: #dc2626;
          --erp-amber-1: #f59e0b;
          --erp-amber-2: #d97706;
          --erp-slate-900: #0f172a;
          --erp-slate-700: #334155;
          --erp-slate-500: #64748b;
          --erp-slate-400: #94a3b8;
          --erp-slate-200: #e2e8f0;
          --erp-slate-100: #f1f5f9;
          --erp-bg: #f5f7fa;
        }

        * {
          box-sizing: border-box;
        }

        .erp-container {
          padding: 1.5rem;
          background: var(--erp-bg);
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ---------- HEADER ---------- */
        .erp-page-header {
          background: linear-gradient(135deg, var(--erp-navy) 0%, var(--erp-navy-deep) 100%);
          padding: 1.75rem 2rem;
          border-radius: 16px;
          margin: 1rem 0 1.5rem;
          box-shadow: 0 10px 28px rgba(15, 58, 74, 0.28);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          position: relative;
          overflow: hidden;
        }

        .erp-page-header::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 88% -20%, rgba(61, 181, 230, 0.35), transparent 55%);
          pointer-events: none;
        }

        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          position: relative;
          z-index: 1;
        }

        .erp-header-icon {
          flex-shrink: 0;
          width: 58px;
          height: 58px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
        }

        .erp-page-title {
          margin: 0;
          font-size: 1.6rem;
          line-height: 1.2;
          font-weight: 700;
          font-family: 'Poppins', sans-serif;
          letter-spacing: -0.01em;
        }

        .erp-page-subtitle {
          margin: 0.35rem 0 0 0;
          opacity: 0.85;
          font-size: 0.95rem;
        }

        .btn-refresh {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.12);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .btn-refresh:hover {
          background: rgba(255, 255, 255, 0.22);
          transform: rotate(50deg);
        }

        /* ---------- STATS ---------- */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.5rem;
          animation: erpFadeUp 0.35s ease both;
        }

        .stat-card {
          background: white;
          padding: 1.5rem 1.6rem;
          border-radius: 14px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
          display: flex;
          align-items: center;
          gap: 1.1rem;
          border: 1px solid var(--erp-slate-200);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.1);
        }

        .stat-card--accent {
          border-color: rgba(61, 181, 230, 0.35);
          background: linear-gradient(180deg, #ffffff 0%, #f2fbff 100%);
        }

        .stat-card-icon {
          flex-shrink: 0;
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.3rem;
          background: linear-gradient(135deg, var(--erp-blue) 0%, var(--erp-navy-deep) 100%);
        }

        .stat-card-icon--purple {
          background: linear-gradient(135deg, var(--erp-purple-1) 0%, var(--erp-purple-2) 100%);
        }

        .stat-card-icon--pink {
          background: linear-gradient(135deg, var(--erp-pink-1) 0%, var(--erp-pink-2) 100%);
        }

        .stat-card-content {
          flex: 1;
          min-width: 0;
        }

        .stat-card-label {
          font-size: 0.82rem;
          color: var(--erp-slate-500);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .stat-card-value {
          font-size: 1.9rem;
          font-weight: 700;
          color: var(--erp-navy-deep);
          font-family: 'Poppins', sans-serif;
          line-height: 1.2;
        }

        /* ---------- CARD SHELL ---------- */
        .erp-card {
          background: white;
          border-radius: 14px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
          border: 1px solid var(--erp-slate-200);
          margin-bottom: 1.5rem;
          overflow: hidden;
        }

        .erp-card-header {
          padding: 1.15rem 1.75rem;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-bottom: 1px solid var(--erp-slate-200);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .erp-card-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--erp-navy-deep);
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .erp-card-icon {
          color: var(--erp-navy);
        }

        .record-count {
          background: linear-gradient(135deg, var(--erp-navy) 0%, var(--erp-navy-deep) 100%);
          color: white;
          padding: 0.35rem 0.9rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .erp-card-body {
          padding: 1.5rem 1.75rem;
        }

        .erp-card-body--flush {
          padding: 0;
        }

        /* ---------- TOOLBAR ---------- */
        .erp-toolbar-card {
          margin-bottom: 1rem;
        }

        .erp-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          flex: 1 1 320px;
          max-width: 480px;
        }

        .search-icon {
          position: absolute;
          left: 1.1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--erp-slate-400);
          font-size: 0.9rem;
        }

        .search-box input {
          width: 100%;
          padding: 0.7rem 1rem 0.7rem 2.6rem;
          border: 1.5px solid var(--erp-slate-200);
          border-radius: 10px;
          font-size: 0.92rem;
          font-family: inherit;
          background: var(--erp-slate-100);
          transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
        }

        .search-box input:focus {
          border-color: var(--erp-blue);
          outline: none;
          background: white;
          box-shadow: 0 0 0 4px rgba(61, 181, 230, 0.12);
        }

        .toolbar-selection {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .select-all-label {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          font-weight: 600;
          color: var(--erp-slate-700);
          cursor: pointer;
          font-size: 0.88rem;
          white-space: nowrap;
        }

        .select-all-count {
          color: var(--erp-slate-500);
          font-weight: 500;
        }

        .select-all-checkbox,
        .row-checkbox {
          width: 17px;
          height: 17px;
          cursor: pointer;
          accent-color: var(--erp-green-1);
        }

        .btn-bulk-approve {
          background: linear-gradient(135deg, var(--erp-green-1) 0%, var(--erp-green-2) 100%);
          color: white;
          padding: 0.65rem 1.3rem;
          font-size: 0.88rem;
          font-weight: 700;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.28);
          white-space: nowrap;
        }

        .btn-bulk-approve:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(5, 150, 105, 0.36);
        }

        .btn-bulk-approve:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* ---------- TABLE ---------- */
        .table-container {
          overflow-x: auto;
        }

        .erp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }

        .erp-table thead {
          background: linear-gradient(135deg, var(--erp-navy-deep) 0%, var(--erp-navy-light) 100%);
        }

        .erp-table th {
          padding: 14px 18px;
          text-align: left;
          font-size: 11.5px;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .header-icon {
          margin-right: 0.4rem;
          color: var(--erp-blue);
        }

        .erp-table tbody tr {
          transition: background 0.15s ease;
        }

        .erp-table tbody tr:not(:last-child) {
          border-bottom: 1px solid var(--erp-slate-200);
        }

        .erp-table tbody tr:hover {
          background: #f0f9ff;
        }

        .erp-table td {
          padding: 14px 18px;
          vertical-align: middle;
        }

        .th-checkbox,
        .cell-checkbox {
          width: 44px;
          text-align: center;
        }

        .student-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .student-avatar {
          flex-shrink: 0;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--erp-blue) 0%, var(--erp-navy) 100%);
          color: white;
          font-weight: 700;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .student-info-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .student-name-cell {
          font-weight: 700;
          color: var(--erp-navy-deep);
          font-size: 0.92rem;
        }

        .student-email {
          font-size: 12.5px;
          color: var(--erp-slate-500);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .badge-icon {
          font-size: 10px;
        }

        .badge-course {
          background: linear-gradient(135deg, var(--erp-navy-deep) 0%, var(--erp-navy-light) 100%);
          color: white;
        }

        .badge-graduation-year {
          background: linear-gradient(135deg, var(--erp-purple-1) 0%, var(--erp-purple-2) 100%);
          color: white;
        }

        .badge-pending {
          background: linear-gradient(135deg, var(--erp-amber-1) 0%, var(--erp-amber-2) 100%);
          color: white;
        }

        .badge-warning {
          margin-top: 6px;
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
          text-transform: none;
          letter-spacing: 0;
          font-size: 10.5px;
          display: inline-flex;
        }

        .cell-status {
          display: table-cell;
        }

        .cell-status .badge + .badge {
          display: flex;
          width: fit-content;
        }

        .department-name {
          color: var(--erp-slate-700);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .text-center {
          text-align: center;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ---------- BUTTONS ---------- */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 16px;
          border: none;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
        }

        .btn-action {
          padding: 8px 14px;
        }

        .btn-view-student {
          background: linear-gradient(135deg, var(--erp-blue) 0%, var(--erp-navy-deep) 100%);
          color: white;
        }

        .btn-approve {
          background: linear-gradient(135deg, var(--erp-green-1) 0%, var(--erp-green-2) 100%);
          color: white;
        }

        .btn-reject {
          background: linear-gradient(135deg, var(--erp-red-1) 0%, var(--erp-red-2) 100%);
          color: white;
        }

        .btn-assign-division {
          background: linear-gradient(135deg, var(--erp-blue) 0%, var(--erp-navy-deep) 100%);
          color: white;
        }

        .btn-secondary {
          background: var(--erp-slate-500);
          color: white;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--erp-navy) 0%, var(--erp-navy-deep) 100%);
          color: white;
        }

        /* Division Modal */
        .modal-header--info h3 { color: var(--erp-blue); }

        .division-loading {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          color: var(--erp-slate-500);
          font-size: 0.9rem;
        }

        .division-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--erp-slate-200);
          border-top-color: var(--erp-blue);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .division-select {
          width: 100%;
          padding: 0.7rem 1rem;
          border: 1.5px solid var(--erp-slate-200);
          border-radius: 9px;
          font-size: 0.9rem;
          font-family: inherit;
          background: white;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }

        .division-select:focus {
          border-color: var(--erp-blue);
          outline: none;
          box-shadow: 0 0 0 4px rgba(61, 181, 230, 0.12);
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

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .spin {
          animation: spin 0.9s linear infinite;
        }

        @keyframes erpFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ---------- PAGINATION / EMPTY ---------- */
        .erp-pagination {
          display: flex;
          justify-content: center;
          padding: 1.25rem;
          border-top: 1px solid var(--erp-slate-200);
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-icon {
          font-size: 3.25rem;
          color: #cbd5e1;
          margin-bottom: 0.75rem;
        }

        .empty-state h3 {
          color: var(--erp-slate-700);
          margin: 0 0 0.4rem;
          font-size: 1.1rem;
        }

        .empty-description {
          color: var(--erp-slate-400);
          margin: 0;
          font-size: 0.92rem;
        }

        /* ---------- MODALS (shared shell) ---------- */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
          animation: erpFadeUp 0.2s ease both;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.32);
        }

        .modal-content--lg {
          max-width: 760px;
        }

        .modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--erp-slate-200);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          position: sticky;
          top: 0;
          background: white;
          z-index: 1;
        }

        .modal-header--danger h3 { color: var(--erp-red-2); }
        .modal-header--success h3 { color: var(--erp-green-2); }

        .modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: var(--erp-navy-deep);
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .modal-header-icon {
          font-size: 1rem;
        }

        .btn-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: var(--erp-slate-100);
          color: var(--erp-slate-500);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .btn-close:hover {
          background: #fee2e2;
          color: var(--erp-red-2);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-lead {
          margin: 0 0 1rem;
          color: var(--erp-slate-700);
          font-size: 0.92rem;
          line-height: 1.5;
        }

        .modal-footer {
          padding: 1.15rem 1.5rem;
          border-top: 1px solid var(--erp-slate-200);
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          position: sticky;
          bottom: 0;
          background: white;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          font-weight: 600;
          color: var(--erp-slate-700);
          font-size: 0.85rem;
          margin-bottom: 0.4rem;
        }

        .form-control {
          width: 100%;
          padding: 0.7rem 0.9rem;
          border: 1.5px solid var(--erp-slate-200);
          border-radius: 9px;
          font-family: inherit;
          font-size: 0.9rem;
          resize: vertical;
        }

        .form-control:focus {
          border-color: var(--erp-blue);
          outline: none;
          box-shadow: 0 0 0 4px rgba(61, 181, 230, 0.12);
        }

        .form-check {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          font-size: 0.88rem;
          color: var(--erp-slate-700);
          cursor: pointer;
        }

        .form-check-input {
          width: 16px;
          height: 16px;
          accent-color: var(--erp-navy);
          cursor: pointer;
        }

        /* ---------- CALLOUTS ---------- */
        .callout {
          display: flex;
          gap: 0.7rem;
          padding: 0.9rem 1.05rem;
          border-radius: 10px;
          font-size: 0.85rem;
          line-height: 1.5;
          margin-bottom: 1.1rem;
        }

        .callout p {
          margin: 0;
        }

        .callout-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .callout-info {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        .callout-warning {
          background: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
          margin-bottom: 0;
        }

        /* ---------- PARENT ACCOUNT CARDS ---------- */
        .parent-account-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
          margin-bottom: 1.1rem;
        }

        .parent-account-card {
          border: 1.5px solid var(--erp-slate-200);
          border-radius: 12px;
          overflow: hidden;
        }

        .parent-account-card-header {
          background: linear-gradient(135deg, var(--erp-navy) 0%, var(--erp-navy-deep) 100%);
          color: white;
          padding: 0.7rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .parent-account-student {
          margin-left: auto;
          font-size: 0.75rem;
          font-weight: 500;
          opacity: 0.85;
        }

        .parent-account-card-body {
          padding: 0.9rem 1rem;
        }

        .parent-account-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.4rem 0;
          font-size: 0.85rem;
        }

        .parent-account-key {
          color: var(--erp-slate-500);
          font-weight: 600;
        }

        .parent-account-value {
          color: var(--erp-slate-900);
          font-weight: 600;
          text-align: right;
          word-break: break-all;
        }

        .parent-account-code {
          background: var(--erp-slate-100);
          border: 1px solid var(--erp-slate-200);
          padding: 3px 9px;
          border-radius: 6px;
          font-weight: 700;
          color: var(--erp-navy-deep);
        }

        .parent-account-note {
          margin: 0.6rem 0 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.76rem;
          color: var(--erp-slate-500);
        }

        /* ---------- RESPONSIVE ---------- */
        @media (max-width: 860px) {
          .erp-container { padding: 1rem; }
          .erp-page-header { padding: 1.5rem; border-radius: 14px; }
        }

        @media (max-width: 640px) {
          .erp-page-header { flex-direction: column; align-items: flex-start; }
          .btn-refresh { align-self: flex-end; margin-top: -2.75rem; }
          .erp-toolbar { flex-direction: column; align-items: stretch; }
          .search-box { max-width: none; }
          .toolbar-selection { justify-content: space-between; }

          .table-container { overflow-x: visible; }

          .erp-table thead { display: none; }
          .erp-table, .erp-table tbody, .erp-table tr, .erp-table td {
            display: block;
            width: 100%;
          }
          .erp-table tbody tr {
            border: 1px solid var(--erp-slate-200);
            border-radius: 12px;
            margin-bottom: 12px;
            padding: 12px 14px;
          }
          .erp-table td {
            padding: 8px 0;
            border: none !important;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
          }
          .erp-table td[data-label]:not([data-label=""])::before {
            content: attr(data-label);
            font-size: 11px;
            font-weight: 700;
            color: var(--erp-slate-400);
            text-transform: uppercase;
            letter-spacing: 0.03em;
            flex-shrink: 0;
          }
          .cell-checkbox { justify-content: flex-end; }
          .cell-student { justify-content: flex-start; }
          .cell-actions { justify-content: flex-start; }
          .action-buttons { justify-content: flex-start; width: 100%; }
        }
      `}</style>
    </div>
  );
}
