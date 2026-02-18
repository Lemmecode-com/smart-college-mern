import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUsers,
  FaSearch,
  FaEye,
  FaCheckCircle,
  FaGraduationCap,
  FaBuilding,
  FaBookOpen,
  FaCalendarAlt,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaExclamationTriangle,
  FaSyncAlt,
  FaSpinner,
  FaInfoCircle,
  FaUserCheck,
  FaUserGraduate,
  FaChartPie,
  FaDownload,
  FaEnvelope
} from "react-icons/fa";

const PAGE_SIZE = 5;

export default function ApproveStudents() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    byDepartment: {},
    byCourse: {},
    byYear: {}
  });

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH APPROVED STUDENTS ================= */
  const fetchApprovedStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/students/approved-students");
      const data = res.data || [];
      setStudents(data);
      
      // Calculate stats client-side (no API changes)
      calculateStats(data);
      setRetryCount(0);
    } catch (err) {
      console.error("Approved students fetch error:", err);
      setError(err.response?.data?.message || "Failed to load approved students. Please try again.");
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
      // Department stats
      const dept = student.department_id?.name || "Unknown";
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
      
      // Course stats
      const course = student.course_id?.name || "Unknown";
      byCourse[course] = (byCourse[course] || 0) + 1;
      
      // Year stats
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
    fetchApprovedStudents();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchApprovedStudents();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  };

  /* ================= SEARCH ================= */
  const filteredStudents = useMemo(() => {
    return students.filter((s) =>
      `${s.fullName} ${s.email} ${s.department_id?.name || ''} ${s.course_id?.name || ''}`
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

  /* ================= EXPORT HANDLER ================= */
  const exportCSV = () => {
    const headers = ["Name", "Email", "Department", "Course", "Admission Year", "Status", "Approved Date"];
    const rows = filteredStudents.map((s) => [
      s.fullName,
      s.email,
      s.department_id?.name || "N/A",
      s.course_id?.name || "N/A",
      s.admissionYear || "N/A",
      "APPROVED",
      new Date(s.approvedAt || s.updatedAt).toLocaleDateString('en-US')
    ]);

    let csvContent = "text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `approved_students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ================= LOADING SKELETON ================= */
  const renderSkeleton = () => (
    <div className="skeleton-container">
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
          {[...Array(8)].map((_, i) => (
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
            <div className="skeleton-cell skeleton-text short"></div>
            <div className="skeleton-cell skeleton-badge"></div>
            <div className="skeleton-cell skeleton-action"></div>
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
        <h3>Approved Students Error</h3>
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
    return (
      <div className="erp-loading-container">
        <div className="erp-loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h4 className="erp-loading-text">Loading approved students...</h4>
        <div className="loading-progress">
          <div className="progress-bar"></div>
        </div>
        {renderSkeleton()}
      </div>
    );
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item"><a href="/students">Students</a></li>
          <li className="breadcrumb-item active" aria-current="page">Approved Students</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaCheckCircle />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Approved Students</h1>
            <p className="erp-page-subtitle">
              View and manage students approved for admission
            </p>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="stats-grid animate-fade-in">
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #4CAF50 0%, #43A047 100%)'}}>
            <FaUserCheck />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Total Approved</div>
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
        {/* <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)'}}>
            <FaCalendarAlt />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Admission Years</div>
            <div className="stat-card-value">{Object.keys(stats.byYear).length}</div>
          </div>
        </div> */}
      </div>

      {/* CONTROLS SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-body">
          <div className="controls-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search approved students by name, email, department, or course..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search approved students"
              />
            </div>
            
            <button 
              className="export-btn" 
              onClick={exportCSV}
              title="Export to CSV"
              aria-label="Export approved students to CSV"
            >
              <FaDownload className="export-icon" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* STUDENTS TABLE */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaGraduationCap className="erp-card-icon" />
            Approved Student Records
          </h3>
          <span className="record-count">
            {filteredStudents.length} {filteredStudents.length === 1 ? "Student" : "Students"} Approved
          </span>
        </div>
        
        <div className="erp-card-body">
          {paginatedStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaCheckCircle />
              </div>
              <h3>No Approved Students Found</h3>
              <p className="empty-description">
                {search 
                  ? "No approved students match your search criteria."
                  : "There are no approved students yet. Students will appear here after approval."}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Name</th>
                    <th><FaEnvelope className="header-icon" /> Email</th>
                    <th><FaBuilding className="header-icon" /> Department</th>
                    <th><FaBookOpen className="header-icon" /> Course</th>
                    <th><FaCalendarAlt className="header-icon" /> Admission Year</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student, index) => (
                    <tr key={student._id} className="table-row">
                      <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                      <td>
                        <div className="student-name">
                          <div className="student-details">
                            <div className="student-fullname">{student.fullName}</div>
                            <div className="student-meta">
                              {/* <span className="student-id">ID: {student.studentId || 'N/A'}</span> */}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <FaEnvelope className="contact-icon" />
                          <span>{student.email}</span>
                        </div>
                      </td>
                      <td>{student.department_id?.name || "N/A"}</td>
                      <td>{student.course_id?.name || "N/A"}</td>
                      <td>{student.admissionYear || "N/A"}</td>
                      <td>
                        <span className="status-badge status-approved">
                          <FaCheckCircle className="status-icon" />
                          APPROVED
                        </span>
                      </td>
                      <td className="action-cell">
                        <button
                          className="action-btn view-btn"
                          title="View Student Details"
                          onClick={() => navigate(`/college/view-approved-student/${student._id}`)}
                          aria-label={`View details for ${student.fullName}`}
                        >
                          <FaEye />
                        </button>
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
        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
          animation: fadeIn 0.6s ease;
        }
        
        .erp-breadcrumb {
          background: transparent;
          padding: 0;
          margin-bottom: 1.5rem;
        }
        
        .breadcrumb {
          background: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .breadcrumb-item a {
          color: #1a4b6d;
          text-decoration: none;
        }
        
        .breadcrumb-item a:hover {
          text-decoration: underline;
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
          background: rgba(76, 175, 80, 0.15);
          color: #4CAF50;
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
        
        .search-box {
          position: relative;
          flex: 1;
          min-width: 300px;
          max-width: 500px;
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
        
        .export-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }
        
        .export-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
        }
        
        .export-icon {
          font-size: 1.1rem;
        }
        
        /* TABLE */
        .table-container {
          overflow-x: auto;
          border-radius: 0 0 16px 16px;
        }
        
        .erp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }
        
        .erp-table thead {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
        }
        
        .erp-table th {
          padding: 1rem 1.25rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.95rem;
          position: relative;
          white-space: nowrap;
        }
        
        .header-icon {
          margin-right: 0.5rem;
          font-size: 0.9rem;
        }
        
        .erp-table tbody tr {
          border-bottom: 1px solid #f0f2f5;
          transition: all 0.2s ease;
        }
        
        .erp-table tbody tr:hover {
          background: #f8f9ff;
        }
        
        .erp-table td {
          padding: 1rem 1.25rem;
          color: #2c3e50;
          font-weight: 500;
          vertical-align: middle;
        }
        
        .student-name {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .student-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1rem;
          flex-shrink: 0;
        }
        
        .student-details {
          flex: 1;
        }
        
        .student-fullname {
          font-weight: 600;
          color: #1a4b6d;
          font-size: 0.95rem;
        }
        
        .student-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 0.25rem;
        }
        
        .student-id {
          font-size: 0.8rem;
          color: #6c757d;
          background: #f0f2f5;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
        }
        
        .contact-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #1a4b6d;
        }
        
        .contact-icon {
          color: #6c757d;
          font-size: 0.9rem;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        
        .status-approved {
          background: rgba(76, 175, 80, 0.15);
          color: #4CAF50;
        }
        
        .status-icon {
          font-size: 0.8rem;
        }
        
        .action-cell {
          text-align: center;
          min-width: 100px;
        }
        
        .action-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }
        
        .view-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
        }
        
        .view-btn:active {
          transform: translateY(0);
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
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(67, 160, 71, 0.1) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4CAF50;
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
        .skeleton-container {
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
          grid-template-columns: 60px repeat(6, 1fr) 100px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        .skeleton-header-cell {
          height: 40px;
          background: #e9ecef;
        }
        
        .skeleton-table-row {
          display: grid;
          grid-template-columns: 60px repeat(6, 1fr) 100px;
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
          
          .search-box {
            min-width: auto;
            max-width: 100%;
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
            grid-template-columns: 60px 2fr 1fr 1fr 100px;
          }
        }
        
        @media (max-width: 480px) {
          .erp-table {
            min-width: 550px;
          }
          
          .erp-card-header h3 {
            font-size: 1.25rem;
          }
          
          .erp-card-header .erp-card-icon {
            font-size: 1.1rem;
          }
          
          .student-name {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .student-meta {
            margin-left: 2.5rem;
          }
          
          .stat-card-label {
            font-size: 0.85rem;
          }
          
          .stat-card-value {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}