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

      // Check if students array exists and has data
      if (!res.students || res.students.length === 0) {
        // No students found - this is OK, not an error
      }

      setStudents(res.students || []);
      setRetryCount(0);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load students for promotion.",
      );
      toast.error(err.response?.data?.message || "Failed to load students", {
        position: "top-right",
        autoClose: 4000,
      });
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
    setSelectedStudent(student);
    setPromotionRemarks("");
    setOverrideFeeCheck(false);
    setShowPromoteModal(true);
  };

  const handlePromoteStudent = async () => {
    try {
      setLoading(true);

      const response = await promoteStudent(selectedStudent._id, {
        remarks: promotionRemarks,
        overrideFeeCheck,
      });

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
      toast.success("Student promoted successfully!", {
        position: "top-right",
        autoClose: 4000,
      });
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
      toast.success(`${res.results.success.length} students promoted successfully!`, {
        position: "top-right",
        autoClose: 4000,
      });
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
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Student Promotion" },
        ]}
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
          background: #f0f4f8;
          min-height: 100vh;
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

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn-outline-primary {
          background: rgba(255, 255, 255, 0.15);
          color: white;
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          flex-wrap: wrap;
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
            flex-direction: column;
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
        }
      `}</style>
    </div>
  );
}
