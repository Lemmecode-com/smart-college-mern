import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";

import {
  FaUsers,
  FaSearch,
  FaCheck,
  FaTimes,
  FaEye,
  FaFileExcel,
  FaFilePdf,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaExclamationTriangle,
  FaSyncAlt,
  FaSpinner,
  FaInfoCircle,
  FaGraduationCap,
  FaEnvelope,
  FaBuilding,
  FaBookOpen,
  FaUserCheck,
  FaUserTimes,
  FaUserClock
} from "react-icons/fa";

const PAGE_SIZE = 5;

export default function StudentList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH STUDENTS ================= */
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/students/registered");
      
      // 🔧 Handle new paginated response structure
      if (res.data.data) {
        // New format: { success: true, data: [...], pagination: {...} }
        setStudents(res.data.data || []);
      } else if (Array.isArray(res.data)) {
        // Old format: [...]
        setStudents(res.data);
      } else {
        setStudents([]);
      }
      
      setRetryCount(0);
    } catch (err) {
      console.error("Students fetch error:", err);
      setError(err.response?.data?.message || "Failed to load students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchStudents();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  };

  /* ================= FILTER + SEARCH ================= */
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) =>
        `${s.fullName} ${s.email} ${s.department_id?.name || ''} ${s.course_id?.name || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .filter((s) =>
        statusFilter === "ALL" ? true : s.status === statusFilter
      );
  }, [students, search, statusFilter]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const paginatedStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  /* ================= ACTIONS ================= */
  const approveStudent = async (id) => {
    if (!window.confirm("Are you sure you want to approve this student?")) return;

    try {
      await api.put(`/students/${id}/approve`);
      // Refresh the list
      fetchStudents();
      // Navigate to Approved Students list with refresh flag
      navigate("/students/approve", { state: { refresh: true } });
    } catch (err) {
      alert("Failed to approve student. Please try again.");
      console.error("Approve error:", err);
    }
  };

  const rejectStudent = async (id) => {
    const reason = prompt("Enter rejection reason (required):");
    if (!reason || reason.trim().length < 5) {
      alert("Rejection reason is required and must be at least 5 characters.");
      return;
    }
    
    try {
      await api.put(`/students/${id}/reject`, { reason: reason.trim() });
      fetchStudents();
    } catch (err) {
      alert("Failed to reject student. Please try again.");
      console.error("Reject error:", err);
    }
  };

  /* ================= EXPORT PDF ================= */
  const exportPDF = () => {
    window.print();
  };

  /* ================= LOADING SKELETON ================= */
  const renderSkeleton = () => (
    <div className="skeleton-table-container">
      <div className="skeleton-stats-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-stat-card">
            <div className="skeleton-stat-icon"></div>
            <div className="skeleton-stat-content">
              <div className="skeleton-stat-label"></div>
              <div className="skeleton-stat-value"></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="skeleton-header-cell"></div>
          ))}
        </div>
        {[...Array(PAGE_SIZE)].map((_, i) => (
          <div key={i} className="skeleton-table-row">
            <div className="skeleton-cell skeleton-text short"></div>
            <div className="skeleton-cell skeleton-text long"></div>
            <div className="skeleton-cell skeleton-text medium"></div>
            <div className="skeleton-cell skeleton-text medium"></div>
            <div className="skeleton-cell skeleton-text medium"></div>
            <div className="skeleton-cell skeleton-badge"></div>
            <div className="skeleton-cell skeleton-actions">
              <div className="skeleton-action"></div>
              <div className="skeleton-action"></div>
              <div className="skeleton-action"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <div className="erp-error-container">
        <div className="erp-error-icon">
          <FaExclamationTriangle />
        </div>
        <h3>Students Loading Error</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button 
            className="erp-btn erp-btn-secondary" 
            onClick={() => navigate(-1)}
          >
            <FaChevronLeft className="erp-btn-icon" />
            Go Back
          </button>
          <button 
            className="erp-btn erp-btn-primary" 
            onClick={handleRetry}
            disabled={retryCount >= 3}
          >
            <FaSyncAlt className="erp-btn-icon" />
            {retryCount >= 3 ? "Max Retries" : `Retry (${retryCount}/3)`}
          </button>
        </div>
      </div>
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading student records..." />;
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Student Management" }
        ]}
      />

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaUsers />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Student Management</h1>
            <p className="erp-page-subtitle">
              Search, filter, approve, and manage student registrations
            </p>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="stats-grid animate-fade-in">
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
            <FaGraduationCap />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Total Students</div>
            <div className="stat-card-value">{students.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
            <FaUserCheck />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Approved</div>
            <div className="stat-card-value">{students.filter(s => s.status === "APPROVED").length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
            <FaUserClock />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Pending</div>
            <div className="stat-card-value">{students.filter(s => s.status === "PENDING").length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'}}>
            <FaUserTimes />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Rejected</div>
            <div className="stat-card-value">{students.filter(s => s.status === "REJECTED").length}</div>
          </div>
        </div>
      </div>

      {/* CONTROLS SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-body">
          <div className="controls-container">
            <div className="search-group">
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search students by name, email, department, or course..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Search students"
                />
              </div>
              
              <div className="filter-dropdown">
                <button className="filter-btn">
                  <FaFilter className="filter-icon" />
                  <span>Status: {statusFilter === "ALL" ? "All" : statusFilter}</span>
                  <FaChevronDown className="filter-arrow" />
                </button>
                <div className="filter-menu">
                  {["ALL", "PENDING", "APPROVED", "REJECTED"].map(status => (
                    <button
                      key={status}
                      className={`filter-option ${statusFilter === status ? 'active' : ''}`}
                      onClick={() => {
                        setStatusFilter(status);
                        setPage(1);
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="export-group">
              <button
                className="export-btn pdf-btn"
                onClick={exportPDF}
                title="Export to PDF"
                aria-label="Export to PDF"
              >
                <FaFilePdf className="export-icon" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STUDENTS TABLE */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaGraduationCap className="erp-card-icon" />
            Student Records
          </h3>
          <span className="record-count">
            {filteredStudents.length} {filteredStudents.length === 1 ? "Student" : "Students"} Found
          </span>
        </div>
        
        <div className="erp-card-body">
          {paginatedStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaUsers />
              </div>
              <h3>No Students Found</h3>
              <p className="empty-description">
                {search || statusFilter !== "ALL" 
                  ? "No students match your search criteria. Try adjusting your filters."
                  : "There are no student registrations yet."}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th className="th-student">
                      <FaUserCheck className="header-icon" /> Student Name
                    </th>
                    <th className="th-course">
                      <FaBookOpen className="header-icon" /> Course
                    </th>
                    <th className="th-department">
                      <FaBuilding className="header-icon" /> Department
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
                      <td className="cell-status">
                        <span className={`badge badge-status-${student.status.toLowerCase()}`}>
                          {student.status === "PENDING" && <FaUserClock className="badge-icon" />}
                          {student.status === "APPROVED" && <FaUserCheck className="badge-icon" />}
                          {student.status === "REJECTED" && <FaUserTimes className="badge-icon" />}
                          {student.status}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="action-buttons">
                          <button
                            className="btn btn-action btn-view-student"
                            onClick={() => navigate(`/college/view-student/${student._id}`)}
                            title="View Student Details"
                          >
                            <FaEye />
                            <span className="btn-text">View</span>
                          </button>

                          {student.status === "PENDING" && (
                            <>
                              <button
                                className="btn btn-action btn-approve-student"
                                onClick={() => approveStudent(student._id)}
                                title="Approve Student"
                              >
                                <FaCheck />
                                <span className="btn-text">Approve</span>
                              </button>
                              <button
                                className="btn btn-action btn-reject-student"
                                onClick={() => rejectStudent(student._id)}
                                title="Reject Student"
                              >
                                <FaTimes />
                                <span className="btn-text">Reject</span>
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
              <button
                className="page-btn prev-btn"
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <FaChevronLeft />
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    className={`page-btn ${page === num ? 'active' : ''}`}
                    onClick={() => setPage(num)}
                    aria-label={`Page ${num}`}
                    aria-current={page === num ? "page" : undefined}
                  >
                    {num}
                  </button>
                ))}
              </div>
              
              <button
                className="page-btn next-btn"
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* STYLES */}
      <style jsx>{`
        /* ================= GLOBAL TYPOGRAPHY ================= */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
          animation: fadeIn 0.6s ease;
        }
        
        .erp-page-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(26, 75, 109, 0.3);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideDown 0.6s ease;
        }
        
        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        
        .erp-header-icon {
          width: 56px;
          height: 56px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
        }
        
        .erp-page-title {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
        }
        
        .erp-page-subtitle {
          margin: 0.375rem 0 0 0;
          opacity: 0.85;
          font-size: 1rem;
        }
        
        /* STATS GRID */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          border-left: 4px solid transparent;
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        }
        
        .stat-card-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          font-size: 1.5rem;
        }
        
        .stat-card-content {
          flex: 1;
        }
        
        .stat-card-label {
          font-size: 0.95rem;
          color: #666;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .stat-card-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1a4b6d;
          line-height: 1;
        }
        
        /* CONTROLS CARD */
        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .erp-card:hover {
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
        }
        
        .erp-card-header {
          padding: 1.5rem 1.75rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .erp-card-header h3 {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
          color: #1a4b6d;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .erp-card-icon {
          color: #1a4b6d;
          font-size: 1.25rem;
        }
        
        .record-count {
          background: rgba(26, 75, 109, 0.1);
          color: #1a4b6d;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }
        
        .erp-card-body {
          padding: 0;
        }
        
        .controls-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.75rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .search-group {
          display: flex;
          gap: 1rem;
          flex: 1;
          min-width: 300px;
        }
        
        .search-box {
          position: relative;
          flex: 1;
          min-width: 280px;
        }
        
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
          font-size: 1rem;
        }
        
        .search-box input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }
        
        .search-box input:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
        }
        
        .filter-dropdown {
          position: relative;
        }
        
        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-weight: 500;
          color: #2c3e50;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .filter-btn:hover {
          border-color: #1a4b6d;
          background: #f8f9fa;
        }
        
        .filter-icon {
          font-size: 1rem;
        }
        
        .filter-arrow {
          font-size: 0.75rem;
          transition: transform 0.3s ease;
        }
        
        .filter-btn:hover .filter-arrow {
          transform: rotate(180deg);
        }
        
        .filter-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 0.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          padding: 0.5rem;
          width: 180px;
          z-index: 1000;
          display: none;
        }
        
        .filter-dropdown:hover .filter-menu {
          display: block;
        }
        
        .filter-option {
          width: 100%;
          padding: 0.5rem 1rem;
          border: none;
          background: none;
          text-align: left;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        
        .filter-option:hover {
          background: #f0f5ff;
        }
        
        .filter-option.active {
          background: #e3f2fd;
          color: #1976d2;
          font-weight: 600;
        }
        
        .export-group {
          display: flex;
          gap: 0.75rem;
        }
        
        .export-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }
        
        .export-icon {
          font-size: 1.1rem;
        }
        
        .excel-btn {
          background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
          color: white;
        }
        
        .excel-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4);
        }
        
        .pdf-btn {
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          color: white;
        }
        
        .pdf-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
        }
        
        /* ================= TABLE ================= */
        .table-container {
          overflow-x: auto;
          border-radius: 12px;
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
          letter-spacing: 1px;
          border-bottom: none;
          white-space: nowrap;
          opacity: 0.95;
          font-family: 'Inter', sans-serif;
        }

        .erp-table th:first-child {
          border-top-left-radius: 12px;
        }

        .erp-table th:last-child {
          border-top-right-radius: 12px;
        }

        .header-icon {
          margin-right: 0.5rem;
          font-size: 0.9rem;
          color: #3db5e6;
        }

        .erp-table tbody tr {
          transition: all 0.25s ease;
          border-bottom: 1px solid #e2e8f0;
        }

        .erp-table tbody tr:hover {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.1);
        }

        .erp-table td {
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
          font-family: 'Inter', sans-serif;
        }

        /* Table Cell Styles */
        .th-student,
        .cell-student {
          min-width: 240px;
        }

        .th-course,
        .cell-course {
          min-width: 180px;
        }

        .th-department,
        .cell-department {
          min-width: 200px;
        }

        .th-status,
        .cell-status {
          min-width: 140px;
        }

        .th-actions,
        .cell-actions {
          min-width: 180px;
        }

        /* Student Info Cell */
        .student-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .student-name-cell {
          font-weight: 700;
          color: #0f3a4a;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
        }

        .student-email {
          font-size: 13px;
          color: #64748b;
          font-family: 'Inter', sans-serif;
        }

        /* Badges */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 24px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-family: 'Inter', sans-serif;
        }

        .badge-icon {
          font-size: 12px;
        }

        .badge-course {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(15, 58, 74, 0.3);
        }

        .badge-status-pending {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
        }

        .badge-status-approved {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
        }

        .badge-status-rejected {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
        }

        .department-name {
          color: #475569;
          font-weight: 600;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
        }

        .text-center {
          text-align: center;
        }

        /* Action Buttons */
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
          text-decoration: none;
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .btn:active {
          transform: translateY(-1px);
        }

        .btn-action {
          padding: 10px 18px;
          font-size: 13px;
          border-radius: 8px;
          transition: all 0.25s ease;
        }

        .btn-action svg {
          font-size: 14px;
        }

        .btn-view-student {
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          color: white;
          box-shadow: 0 3px 10px rgba(61, 181, 230, 0.3);
        }

        .btn-view-student:hover {
          background: linear-gradient(135deg, #0f3a4a 0%, #3db5e6 100%);
          box-shadow: 0 5px 15px rgba(61, 181, 230, 0.4);
        }

        .btn-approve-student {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: white;
          box-shadow: 0 3px 10px rgba(5, 150, 105, 0.3);
        }

        .btn-approve-student:hover {
          background: linear-gradient(135deg, #047857 0%, #059669 100%);
          box-shadow: 0 5px 15px rgba(5, 150, 105, 0.4);
        }

        .btn-reject-student {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          box-shadow: 0 3px 10px rgba(239, 68, 68, 0.3);
        }

        .btn-reject-student:hover {
          background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
          box-shadow: 0 5px 15px rgba(239, 68, 68, 0.4);
        }

        .btn-text {
          margin-left: 4px;
        }
        
        /* PAGINATION */
        .erp-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          border-top: 1px solid #e9ecef;
          gap: 0.5rem;
        }
        
        .page-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: none;
          background: #f8f9fa;
          color: #1a4b6d;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .page-btn:hover:not(:disabled) {
          background: #e9ecef;
          transform: translateY(-1px);
        }
        
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .page-btn.active {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
        }
        
        .page-numbers {
          display: flex;
          gap: 0.25rem;
        }
        
        /* EMPTY STATE */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #666;
        }
        
        .empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, rgba(26, 75, 109, 0.1) 0%, rgba(15, 58, 74, 0.1) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a4b6d;
          font-size: 2.5rem;
        }
        
        .empty-state h3 {
          font-size: 1.75rem;
          color: #2c3e50;
          margin-bottom: 0.75rem;
        }
        
        .empty-description {
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          color: #6c757d;
        }
        
        /* SKELETON LOADING */
        .skeleton-table-container {
          padding: 1.5rem;
        }
        
        .skeleton-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .skeleton-stat-card {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        
        .skeleton-stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: #e9ecef;
        }
        
        .skeleton-stat-content {
          flex: 1;
        }
        
        .skeleton-stat-label {
          height: 16px;
          background: #e9ecef;
          border-radius: 4px;
          width: 60%;
          margin-bottom: 0.5rem;
        }
        
        .skeleton-stat-value {
          height: 28px;
          background: #e9ecef;
          border-radius: 4px;
          width: 40%;
        }
        
        .skeleton-table {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .skeleton-table-header {
          display: grid;
          grid-template-columns: 60px repeat(5, 1fr) 160px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        .skeleton-header-cell {
          height: 40px;
          background: #e9ecef;
        }
        
        .skeleton-table-row {
          display: grid;
          grid-template-columns: 60px repeat(5, 1fr) 160px;
          border-bottom: 1px solid #f0f2f5;
          padding: 1rem 1.25rem;
        }
        
        .skeleton-cell {
          height: 24px;
          background: #f0f2f5;
          border-radius: 6px;
          position: relative;
          overflow: hidden;
        }
        
        .skeleton-cell::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: skeleton-loading 1.5s infinite;
        }
        
        .skeleton-text.long { width: 80%; }
        .skeleton-text.medium { width: 60%; }
        .skeleton-text.short { width: 40%; }
        .skeleton-badge { width: 50%; height: 20px; }
        .skeleton-actions { display: flex; gap: 0.5rem; justify-content: center; }
        .skeleton-action { width: 36px; height: 36px; border-radius: 8px; }
        
        @keyframes skeleton-loading {
          to { left: 100%; }
        }
        
        /* ERROR CONTAINER */
        .erp-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin: 2rem;
        }
        
        .erp-error-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(244, 67, 54, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: #F44336;
          font-size: 3rem;
        }
        
        .erp-error-container h3 {
          font-size: 1.8rem;
          color: #1a4b6d;
          margin-bottom: 1rem;
        }
        
        .erp-error-container p {
          color: #666;
          font-size: 1.1rem;
          max-width: 600px;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }
        
        .error-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        /* LOADING CONTAINER */
        .erp-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 2rem;
          position: relative;
        }
        
        .erp-loading-spinner {
          position: relative;
          width: 80px;
          height: 80px;
        }
        
        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 4px solid transparent;
          border-top-color: #1a4b6d;
          animation: spin 1s linear infinite;
        }
        
        .spinner-ring:nth-child(2) {
          border-top-color: #0f3a4a;
          animation-delay: 0.1s;
        }
        
        .spinner-ring:nth-child(3) {
          border-top-color: rgba(26, 75, 109, 0.5);
          animation-delay: 0.2s;
        }
        
        .erp-loading-text {
          font-size: 1.35rem;
          font-weight: 600;
          color: #1a4b6d;
        }
        
        .loading-progress {
          width: 250px;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-top: -1rem;
        }
        
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #1a4b6d 0%, #0f3a4a 100%);
          width: 35%;
          animation: progressPulse 1.8s ease-in-out infinite;
        }
        
        /* ANIMATIONS */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes progressPulse {
          0%, 100% { width: 35%; }
          50% { width: 65%; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 992px) {
          .controls-container {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-group {
            width: 100%;
          }
          
          .search-box {
            min-width: auto;
          }
          
          .erp-table {
            min-width: 750px;
          }
        }
        
        @media (max-width: 768px) {
          .erp-container {
            padding: 1rem;
          }
          
          .erp-page-header {
            padding: 1.5rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          }
          
          .stat-card-value {
            font-size: 1.75rem;
          }
          
          .erp-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          
          .record-count {
            align-self: flex-end;
          }
          
          .erp-table {
            min-width: 650px;
          }
          
          .action-buttons {
            flex-direction: column;
            align-items: center;
          }
          
          .action-btn {
            width: 100%;
            margin-bottom: 0.5rem;
          }
          
          .page-numbers {
            flex-wrap: wrap;
          }
          
          .page-btn {
            width: 36px;
            height: 36px;
            font-size: 0.85rem;
          }
          
          .empty-icon {
            width: 60px;
            height: 60px;
            font-size: 2rem;
          }
          
          .empty-state h3 {
            font-size: 1.5rem;
          }
          
          .skeleton-table-header,
          .skeleton-table-row {
            grid-template-columns: 60px 2fr 1fr 1fr 120px;
          }
        }
        
        @media (max-width: 480px) {
          .erp-table {
            min-width: 550px;
          }

          .erp-card-header h3 {
            font-size: 1.125rem;
          }

          .erp-card-header .erp-card-icon {
            font-size: 1.1rem;
          }

          .student-name-cell {
            font-size: 14px;
          }

          .student-email {
            font-size: 12px;
          }

          .department-name {
            font-size: 13px;
          }

          .badge {
            font-size: 11px;
            padding: 6px 12px;
          }

          .stat-card-label {
            font-size: 0.85rem;
          }

          .stat-card-value {
            font-size: 1.5rem;
          }

          .erp-page-title {
            font-size: 1.375rem;
          }
        }

        @media print {
          .erp-container {
            padding: 0;
            background: white;
          }

          .erp-breadcrumb,
          .erp-page-header,
          .stats-grid,
          .erp-card-header,
          .controls-container,
          .action-cell,
          .erp-pagination {
            display: none !important;
          }

          .erp-card {
            box-shadow: none;
            border-radius: 0;
          }

          .erp-table {
            width: 100%;
            min-width: auto;
          }

          .erp-table thead {
            background: #0f3a4a !important;
          }

          .erp-table th,
          .erp-table td {
            padding: 8px;
            font-size: 12px;
          }

          .student-fullname {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}