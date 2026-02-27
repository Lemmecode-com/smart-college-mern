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
            <FaGraduationCap /> View History
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
        <div className="stat-card">
          <div className="stat-icon">
            <FaGraduationCap />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Students</div>
            <div className="stat-value">{students.length}</div>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon">
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Fees Paid</div>
            <div className="stat-value">{fullyPaidCount}</div>
          </div>
        </div>

        <div className="stat-card stat-danger">
          <div className="stat-icon">
            <FaExclamationTriangle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Fees Pending</div>
            <div className="stat-value">{pendingCount}</div>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-icon">
            <FaArrowUp />
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
                Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(page * PAGE_SIZE, filteredStudents.length)} of{" "}
                {filteredStudents.length} students
              </div>
              <div className="pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-outline-secondary btn-sm"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`btn btn-sm ${
                      page === i + 1 ? "btn-primary" : "btn-outline-secondary"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outline-secondary btn-sm"
                >
                  Next
                </button>
              </div>
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

      {/* Custom Styles */}
      <style>{`
        .page-container {
          padding: 24px;
          background: #f5f7fa;
          min-height: 100vh;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a2e;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
        }

        .header-icon {
          color: #4f46e5;
          font-size: 32px;
        }

        .page-subtitle {
          color: #666;
          font-size: 14px;
          margin-top: 4px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          background: #e0e7ff;
          color: #4f46e5;
        }

        .stat-success .stat-icon {
          background: #dcfce7;
          color: #16a34a;
        }

        .stat-danger .stat-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .stat-info .stat-icon {
          background: #dbeafe;
          color: #2563eb;
        }

        .stat-label {
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a2e;
        }

        .filter-bar {
          background: white;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px 10px 40px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
        }

        .filter-select {
          padding: 10px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }

        .card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .card-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-body {
          padding: 20px;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table thead th {
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          background: #f8f9fa;
          border-bottom: 2px solid #e0e0e0;
        }

        .data-table tbody td {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
        }

        .student-name {
          font-weight: 600;
          color: #1a1a2e;
        }

        .student-email {
          font-size: 13px;
          color: #666;
          margin-top: 2px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .badge-success {
          background: #dcfce7;
          color: #16a34a;
        }

        .badge-warning {
          background: #fef3c7;
          color: #d97706;
        }

        .badge-danger {
          background: #fee2e2;
          color: #dc2626;
        }

        .badge-info {
          background: #dbeafe;
          color: #2563eb;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
        }

        .btn-primary:hover {
          background: #4338ca;
        }

        .btn-outline-primary {
          background: white;
          color: #4f46e5;
          border: 2px solid #4f46e5;
        }

        .btn-outline-secondary {
          background: white;
          color: #666;
          border: 1px solid #e0e0e0;
        }

        .btn-secondary {
          background: #666;
          color: white;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }

        .bulk-action-bar {
          background: #dbeafe;
          border: 1px solid #93c5fd;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 20px;
          color: #999;
          cursor: pointer;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .student-info-card {
          background: linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .fee-details {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .fee-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }

        .fee-label {
          color: #666;
          font-size: 14px;
        }

        .fee-value {
          font-weight: 600;
          color: #1a1a2e;
        }

        .promoted-by-info {
          background: #e0e7ff;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 3px solid #4f46e5;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
        }

        .info-label {
          color: #666;
          font-size: 13px;
          font-weight: 500;
        }

        .info-value {
          font-weight: 600;
          color: #4f46e5;
          font-size: 14px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
        }

        .form-control {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alert-success {
          background: #dcfce7;
          color: #16a34a;
          border-left: 4px solid #16a34a;
        }

        .alert-danger {
          background: #fee2e2;
          color: #dc2626;
          border-left: 4px solid #dc2626;
        }

        .alert-warning {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .loading-container {
          text-align: center;
          padding: 40px;
        }

        .spinner-icon {
          font-size: 32px;
          animation: spin 1s linear infinite;
          color: #4f46e5;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 64px;
          color: #e0e0e0;
          margin-bottom: 16px;
        }

        .custom-checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .fee-amount {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .rupee-icon {
          font-size: 12px;
        }

        .card-footer {
          padding: 16px 20px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pagination {
          display: flex;
          gap: 8px;
        }

        .pagination-info {
          font-size: 13px;
          color: #666;
        }
      `}</style>
    </div>
  );
}
