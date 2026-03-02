import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import {
  getPromotionEligibleStudents,
  promoteStudent,
  bulkPromoteStudents,
  getCollegePromotionHistory,
} from "../../../api/promotion";
import { moveToAlumni } from "../../../api/alumni";
import Loading from "../../../components/Loading";
import Pagination from "../../../components/Pagination";
import ConfirmModal from "../../../components/ConfirmModal";

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

export default function StudentPromotion() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [promotionRemarks, setPromotionRemarks] = useState("");
  const [overrideFeeCheck, setOverrideFeeCheck] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const [promotedByName, setPromotedByName] = useState(user?.name || "Admin");
  const [showAlumniModal, setShowAlumniModal] = useState(false);
  const [alumniStudent, setAlumniStudent] = useState(null);
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear());

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
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  // 🎓 HELPER: Calculate academic year number from semester & admission year
  const getAcademicYear = (semester, admissionYear) => {
    const yearNumber = Math.ceil(semester / 2); // Sem 1-2 = Year 1, Sem 3-4 = Year 2
    return `Year ${yearNumber}`;
  };

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
      setError("");
      const res = await getPromotionEligibleStudents();
      setStudents(res.students || []);
      setRetryCount(0);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError(
        err.response?.data?.message || "Failed to load students for promotion.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchPromotionHistory = async () => {
    try {
      const res = await getCollegePromotionHistory({ limit: 50 });
      setPromotionHistory(res.promotions || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  useEffect(() => {
    fetchEligibleStudents();
  }, []);

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount((prev) => prev + 1);
      fetchEligibleStudents();
    } else {
      setError("Maximum retry attempts reached.");
    }
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
    console.log("Opening promote modal for:", student);
    console.log("Student fee data:", student.fee);
    setSelectedStudent(student);
    setPromotionRemarks("");
    setOverrideFeeCheck(false);
    setShowPromoteModal(true);
  };

  const handlePromoteStudent = async () => {
    try {
      setLoading(true);
      console.log("Promoting student:", selectedStudent._id);
      console.log("Promotion data:", {
        remarks: promotionRemarks,
        overrideFeeCheck,
      });

      const response = await promoteStudent(selectedStudent._id, {
        remarks: promotionRemarks,
        overrideFeeCheck,
      });

      console.log("Promotion response:", response);

      // ✅ Updated success message with year-wise info
      const currentYear = getAcademicYear(
        selectedStudent.currentSemester,
        selectedStudent.admissionYear,
      );
      const nextYear = getAcademicYear(
        selectedStudent.currentSemester + 1,
        selectedStudent.admissionYear,
      );

      setSuccessMessage(
        `${selectedStudent.fullName} promoted successfully from ${currentYear} (Sem ${selectedStudent.currentSemester}) to ${nextYear} (Sem ${selectedStudent.currentSemester + 1})`,
      );
      setShowPromoteModal(false);
      fetchEligibleStudents();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("Promotion error:", err);
      console.error("Error response:", err.response?.data);
      
      // Show specific error message
      const errorMessage = err.response?.data?.message || err.message || "Failed to promote student.";
      setError(errorMessage);
      alert(errorMessage); // Show alert for immediate feedback
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToAlumni = async () => {
    try {
      setLoading(true);
      console.log("Moving to Alumni:", alumniStudent._id);

      const response = await moveToAlumni(alumniStudent._id, {
        graduationYear,
      });

      console.log("Alumni response:", response);

      setSuccessMessage(`${alumniStudent.fullName} has been moved to Alumni successfully`);
      setShowAlumniModal(false);
      fetchEligibleStudents();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("Alumni error:", err);
      console.error("Error response:", err.response?.data);

      const errorMessage = err.response?.data?.message || err.message || "Failed to move to Alumni.";
      setError(errorMessage);
      alert(errorMessage);
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
        overrideFeeCheck,
      });
      setSuccessMessage(
        `${res.results.success.length} students promoted successfully!`,
      );
      setSelectedStudents([]);
      fetchEligibleStudents();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setError(err.response?.data?.message);
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

  if (error && !loading && students.length === 0) {
    return (
      <div className="erp-error-container">
        <div className="erp-error-icon">
          <FaExclamationTriangle />
        </div>
        <h3>Student Promotion Error</h3>
        <p>{error}</p>
        <button onClick={handleRetry} className="btn btn-primary">
          <FaSyncAlt /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
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
          <button onClick={viewHistory} className="btn btn-outline-primary">
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

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-icon stat-icon-primary">
            <FaUsers />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Students</div>
            <div className="stat-value">{students.length}</div>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon stat-icon-success">
            <FaDollarSign />
          </div>
          <div className="stat-content">
            <div className="stat-label">Fees Paid</div>
            <div className="stat-value">{fullyPaidCount}</div>
          </div>
        </div>

        <div className="stat-card stat-danger">
          <div className="stat-icon stat-icon-danger">
            <FaExclamationTriangle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Fees Pending</div>
            <div className="stat-value">{pendingCount}</div>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-icon stat-icon-info">
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
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FaGraduationCap /> Promotion History
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="btn btn-outline-secondary"
            >
              ← Back to Students
            </button>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Promotion</th>
                    <th>Fee Status</th>
                    <th>Date</th>
                    <th>Promoted By</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {promotionHistory && promotionHistory.length > 0 ? (
                    promotionHistory.map((record) => (
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
                        <td className="text-muted">
                          {new Date(record.promotionDate).toLocaleDateString()}
                        </td>
                        <td className="text-muted">
                          {record.promotedByName || "-"}
                        </td>
                        <td className="text-muted">{record.remarks || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center" style={{ padding: "40px" }}>
                        No promotion history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Students Table */
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Eligible Students</h3>
            <div className="card-header-actions">
              <span className="text-muted">
                {filteredStudents.length} of {students.length} students
              </span>
            </div>
          </div>
          <div className="card-body">
            {loading && students.length === 0 ? (
              <div className="loading-container">
                <FaSpinner className="spinner-icon" />
                <p>Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="empty-state">
                <FaGraduationCap className="empty-icon" />
                <p className="empty-title">No students found</p>
                <p className="empty-text">
                  Try adjusting your search or filters
                </p>
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
                              {getAcademicYear(
                                student.currentSemester,
                                student.admissionYear,
                              )}
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
                          <div className="d-flex" style={{ gap: "8px" }}>
                            <button
                              onClick={() => openPromoteModal(student)}
                              disabled={!student.allInstallmentsPaid}
                              className={`btn btn-sm ${
                                student.allInstallmentsPaid
                                  ? "btn-primary"
                                  : "btn-secondary disabled"
                              }`}
                              title={
                                student.allInstallmentsPaid
                                  ? "Click to promote"
                                  : "Fees pending - cannot promote"
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
                    {getAcademicYear(
                      selectedStudent.currentSemester,
                      selectedStudent.admissionYear,
                    )}
                    (Sem {selectedStudent.currentSemester}) →
                    {getAcademicYear(
                      selectedStudent.currentSemester + 1,
                      selectedStudent.admissionYear,
                    )}
                    (Sem {selectedStudent.currentSemester + 1})
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

              {/* Override Checkbox */}
              {!selectedStudent.allInstallmentsPaid && (
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
                disabled={loading}
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

      {/* Custom Styles */}
      <style>{`
        .page-container {
          padding: 24px;
          background: linear-gradient(135deg, #f5f7fa 0%, #e3e7ed 100%);
          min-height: 100vh;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
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
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          margin-top: 4px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .stat-card.stat-primary {
          border-left-color: #667eea;
        }

        .stat-card.stat-success {
          border-left-color: #10b981;
        }

        .stat-card.stat-danger {
          border-left-color: #ef4444;
        }

        .stat-card.stat-info {
          border-left-color: #3b82f6;
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .stat-icon-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .stat-icon-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .stat-icon-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .stat-icon-info {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .stat-card:hover .stat-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .stat-label {
          font-size: 13px;
          color: #666;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 800;
          color: #1a1a2e;
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
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
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
          color: #999;
          font-size: 16px;
        }

        .clear-search-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #666;
        }

        .clear-search-btn:hover {
          background: #e5e7eb;
          color: #333;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
          outline: none;
        }

        .filter-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .filter-select {
          padding: 12px 20px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .filter-select:focus {
          border-color: #667eea;
          outline: none;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .card-header {
          padding: 20px 24px;
          border-bottom: 2px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        }

        .card-title {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a2e;
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
          padding: 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border-bottom: 2px solid #e5e7eb;
        }

        .data-table tbody td {
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
        }

        .data-table tbody tr {
          transition: all 0.2s ease;
        }

        .data-table tbody tr:hover {
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        }

        .student-name {
          font-weight: 700;
          color: #1a1a2e;
          font-size: 15px;
        }

        .student-email {
          font-size: 13px;
          color: #6b7280;
          margin-top: 4px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge-success {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
        }

        .badge-warning {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
        }

        .badge-danger {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
        }

        .badge-info {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-outline-primary {
          background: white;
          color: #667eea;
          border: 2px solid #667eea;
        }

        .btn-outline-primary:hover {
          background: #667eea;
          color: white;
        }

        .btn-outline-secondary {
          background: white;
          color: #6b7280;
          border: 1px solid #e5e7eb;
        }

        .btn-outline-secondary:hover {
          background: #f9fafb;
          color: #374151;
          border-color: #d1d5db;
        }

        .btn-sm {
          padding: 8px 14px;
          font-size: 13px;
        }

        .bulk-action-bar {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border: 2px solid #93c5fd;
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .bulk-action-text {
          font-weight: 600;
          color: #1e40af;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
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
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
          padding: 24px;
          border-bottom: 2px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border-radius: 20px 20px 0 0;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .modal-close {
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #6b7280;
          font-size: 18px;
        }

        .modal-close:hover {
          background: #e5e7eb;
          color: #1f2937;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-footer {
          padding: 20px 24px;
          border-top: 2px solid #f3f4f6;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          background: #f9fafb;
          border-radius: 0 0 20px 20px;
        }

        .student-info-card {
          background: linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          border-left: 4px solid #667eea;
        }

        .fee-details {
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .fee-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .fee-row:last-child {
          border-bottom: none;
        }

        .fee-label {
          color: #6b7280;
          font-size: 14px;
          font-weight: 600;
        }

        .fee-value {
          font-weight: 700;
          color: #1a1a2e;
          font-size: 15px;
        }

        .text-success {
          color: #10b981 !important;
        }

        .text-danger {
          color: #ef4444 !important;
        }

        .text-muted {
          color: #9ca3af !important;
        }

        .fw-bold {
          font-weight: 700 !important;
        }

        .promoted-by-info {
          background: linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          border-left: 4px solid #667eea;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }

        .info-label {
          color: #6b7280;
          font-size: 13px;
          font-weight: 600;
        }

        .info-value {
          font-weight: 700;
          color: #667eea;
          font-size: 14px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          margin-bottom: 10px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .form-control {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          resize: vertical;
          transition: all 0.3s ease;
        }

        .form-control:focus {
          border-color: #667eea;
          outline: none;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
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
          border-left: 4px solid #10b981;
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
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
          border-left: 4px solid #3b82f6;
        }

        .alert-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }

        .loading-container {
          text-align: center;
          padding: 60px 20px;
        }

        .spinner-icon {
          font-size: 48px;
          animation: spin 1s linear infinite;
          color: #667eea;
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
          color: #e5e7eb;
          margin-bottom: 20px;
        }

        .empty-title {
          font-size: 20px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 8px;
        }

        .empty-text {
          color: #9ca3af;
          font-size: 15px;
        }

        .custom-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #667eea;
        }

        .fee-amount {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        .rupee-icon {
          font-size: 14px;
        }

        .card-footer {
          padding: 20px 24px;
          border-top: 2px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          flex-wrap: wrap;
          gap: 16px;
        }

        .pagination-info {
          font-size: 14px;
          color: #6b7280;
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
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .filter-bar {
            flex-direction: column;
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
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
