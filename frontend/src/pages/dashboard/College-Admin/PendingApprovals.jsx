import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Pagination from "../../../components/Pagination";
import Breadcrumb from "../../../components/Breadcrumb";

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
  FaUsers
} from "react-icons/fa";

const PAGE_SIZE = 5;

export default function PendingApprovals() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    byDepartment: {},
    byCourse: {},
    byYear: {}
  });

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

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
      const pendingStudents = data.filter(s => s.status === "PENDING");
      setStudents(pendingStudents);
      calculateStats(pendingStudents);
    } catch (err) {
      console.error("Pending students fetch error:", err);
      setError(err.response?.data?.message || "Failed to load pending students.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= CALCULATE STATS ================= */
  const calculateStats = (studentList) => {
    const byDepartment = {};
    const byCourse = {};
    const byYear = {};

    studentList.forEach(student => {
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
      byYear
    });
  };

  useEffect(() => {
    fetchPendingStudents();
  }, []);

  /* ================= APPROVE HANDLER ================= */
  const handleApprove = async (studentId) => {
    if (!confirm("Are you sure you want to approve this student? An approval email will be sent to them.")) {
      return;
    }

    setProcessingId(studentId);
    try {
      await api.put(`/students/${studentId}/approve`);
      alert("✅ Student approved successfully! Approval email sent to student.");
      fetchPendingStudents(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve student");
    } finally {
      setProcessingId(null);
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
      alert("Please provide a rejection reason");
      return;
    }

    setProcessingId(selectedStudentId);
    try {
      await api.put(`/students/${selectedStudentId}/reject`, {
        reason: rejectReason,
        allowReapply: true
      });
      alert("Student rejected. Notification email sent to student.");
      setShowRejectModal(false);
      fetchPendingStudents();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject student");
    } finally {
      setProcessingId(null);
      setSelectedStudentId(null);
    }
  };

  /* ================= SEARCH ================= */
  const filteredStudents = useMemo(() => {
    return students.filter((s) =>
      `${s.fullName} ${s.email} ${s.department_id?.name || ''} ${s.course_id?.name || ''} ${s.admissionYear || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [students, search]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const paginatedStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading pending approvals..." />;
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Students", path: "/students" },
          { label: "Pending Approvals" }
        ]}
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
              Review and approve/reject student admission applications
            </p>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="stats-grid animate-fade-in">
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)'}}>
            <FaClock />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Pending Approval</div>
            <div className="stat-card-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)'}}>
            <FaBuilding />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Departments</div>
            <div className="stat-card-value">{Object.keys(stats.byDepartment).length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)'}}>
            <FaBookOpen />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Courses</div>
            <div className="stat-card-value">{Object.keys(stats.byCourse).length}</div>
          </div>
        </div>
      </div>

      {/* CONTROLS SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-body">
          <div className="controls-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search pending students by name, email, department, or course..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search pending students"
              />
            </div>
          </div>
        </div>
      </div>

      {/* STUDENTS TABLE */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaClock className="erp-card-icon" />
            Awaiting Your Review
          </h3>
          <span className="record-count">
            {filteredStudents.length} {filteredStudents.length === 1 ? "Student" : "Students"} Pending
          </span>
        </div>

        <div className="erp-card-body">
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
                    <th className="th-student">
                      <FaGraduationCap className="header-icon" /> Student Name
                    </th>
                    <th className="th-course">
                      <FaBookOpen className="header-icon" /> Course
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
                  {paginatedStudents.map((student, index) => (
                    <tr key={student._id} className="table-row">
                      <td className="cell-student">
                        <div className="student-info">
                          <span className="student-name-cell">{student.fullName}</span>
                          <span className="student-email">{student.email}</span>
                        </div>
                      </td>
                      <td className="cell-course">
                        <span className="badge badge-course">
                          {student.course_id?.name || "N/A"}
                        </span>
                      </td>
                      <td className="cell-department">
                        <span className="department-name">
                          {student.department_id?.name || "N/A"}
                        </span>
                      </td>
                      <td className="cell-year">
                        <span className="badge badge-graduation-year">
                          <FaCalendarAlt className="badge-icon" />
                          {student.admissionYear || "N/A"}
                        </span>
                      </td>
                      <td className="cell-status">
                        <span className="badge badge-pending">
                          <FaClock className="badge-icon" />
                          PENDING
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="action-buttons">
                          <button
                            className="btn btn-action btn-view"
                            onClick={() => navigate(`/college/registered/${student._id}`)}
                            title="View Details"
                          >
                            <FaEye />
                            <span className="btn-text">View</span>
                          </button>
                          <button
                            className="btn btn-action btn-approve"
                            onClick={() => handleApprove(student._id)}
                            disabled={processingId === student._id}
                            title="Approve Student"
                          >
                            <FaCheck />
                            <span className="btn-text">
                              {processingId === student._id ? "Processing..." : "Approve"}
                            </span>
                          </button>
                          <button
                            className="btn btn-action btn-reject"
                            onClick={() => handleRejectClick(student._id)}
                            disabled={processingId === student._id}
                            title="Reject Student"
                          >
                            <FaTimes />
                            <span className="btn-text">
                              {processingId === student._id ? "Processing..." : "Reject"}
                            </span>
                          </button>
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

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FaTimes className="text-danger me-2" />
                Reject Student Application
              </h3>
              <button
                className="btn-close"
                onClick={() => setShowRejectModal(false)}
              />
            </div>
            <div className="modal-body">
              <p className="mb-3">
                Please provide a reason for rejection. The student will receive this information via email.
              </p>
              <div className="form-group">
                <label className="form-label">Rejection Reason *</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="E.g., Incomplete documents, Does not meet eligibility criteria, etc."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-check mt-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="allowReapply"
                  defaultChecked
                />
                <label className="form-check-label" htmlFor="allowReapply">
                  Allow student to reapply after addressing issues
                </label>
              </div>
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
                disabled={!rejectReason.trim() || processingId}
              >
                {processingId ? "Processing..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .erp-page-header {
          background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 24px rgba(255, 152, 0, 0.3);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .erp-header-icon {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }

        .erp-page-title {
          margin: 0;
          font-size: 1.875rem;
          font-weight: 700;
          font-family: 'Poppins', sans-serif;
        }

        .erp-page-subtitle {
          margin: 0.375rem 0 0 0;
          opacity: 0.9;
          font-size: 1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: white;
          padding: 1.75rem;
          border-radius: 16px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          border-left: 4px solid #FF9800;
        }

        .stat-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
        }

        .stat-card-content {
          flex: 1;
        }

        .stat-card-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 600;
        }

        .stat-card-value {
          font-size: 2rem;
          font-weight: 700;
          color: #0f3a4a;
        }

        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
        }

        .erp-card-header {
          padding: 1.5rem 2rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .erp-card-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f3a4a;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .erp-card-icon {
          color: #FF9800;
        }

        .record-count {
          background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
          color: white;
          padding: 0.375rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .controls-container {
          display: flex;
          padding: 1.5rem 2rem;
        }

        .search-box {
          position: relative;
          flex: 1;
          max-width: 500px;
        }

        .search-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-box input {
          width: 100%;
          padding: 0.875rem 1.25rem 0.875rem 2.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.95rem;
        }

        .search-box input:focus {
          border-color: #FF9800;
          outline: none;
          box-shadow: 0 0 0 0.25rem rgba(255, 152, 0, 0.1);
        }

        .table-container {
          overflow-x: auto;
        }

        .erp-table {
          width: 100%;
          border-collapse: collapse;
        }

        .erp-table thead {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
        }

        .erp-table th {
          padding: 16px 20px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
        }

        .header-icon {
          margin-right: 0.5rem;
          color: #FF9800;
        }

        .erp-table tbody tr:hover {
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        }

        .erp-table td {
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .student-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .student-name-cell {
          font-weight: 700;
          color: #0f3a4a;
        }

        .student-email {
          font-size: 13px;
          color: #64748b;
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
        }

        .badge-icon {
          font-size: 12px;
        }

        .badge-course {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
          color: white;
        }

        .badge-graduation-year {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .badge-pending {
          background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
          color: white;
        }

        .department-name {
          color: #475569;
          font-weight: 600;
        }

        .text-center {
          text-align: center;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-action {
          padding: 10px 16px;
        }

        .btn-view {
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
          color: white;
        }

        .btn-approve {
          background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%);
          color: white;
        }

        .btn-reject {
          background: linear-gradient(135deg, #f44336 0%, #e53935 100%);
          color: white;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .erp-pagination {
          display: flex;
          justify-content: center;
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-icon {
          font-size: 4rem;
          color: #cbd5e1;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          color: #64748b;
          margin-bottom: 0.5rem;
        }

        .empty-description {
          color: #94a3b8;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #0f3a4a;
          display: flex;
          align-items: center;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-footer {
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        .btn-secondary {
          background: #64748b;
          color: white;
        }

        .btn-danger {
          background: linear-gradient(135deg, #f44336 0%, #e53935 100%);
          color: white;
        }

        .form-label {
          font-weight: 600;
          color: #475569;
        }

        .form-control:focus {
          border-color: #FF9800;
          box-shadow: 0 0 0 0.25rem rgba(255, 152, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
