import { useContext, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Pagination from "../../../components/Pagination";

import {
  FaSearch,
  FaEye,
  FaCheckCircle,
  FaGraduationCap,
  FaBuilding,
  FaBookOpen,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaSyncAlt,
  FaUserCheck,
  FaEnvelope
} from "react-icons/fa";

const PAGE_SIZE = 5;

export default function ApproveStudents() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

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
      
      // 🔧 Handle new paginated response structure
      let data;
      if (res.data.data) {
        // New format: { success: true, data: [...], pagination: {...} }
        data = res.data.data;
      } else if (Array.isArray(res.data)) {
        // Old format: [...]
        data = res.data;
      } else {
        data = [];
      }
      
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

  // Refresh when navigating from approval action
  useEffect(() => {
    if (location.state?.refresh) {
      fetchApprovedStudents();
      // Clear the refresh flag
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.refresh]);

  // Refresh on page focus (when user returns to tab) - with debounce to prevent excessive calls
  useEffect(() => {
    let lastRefreshTime = 0;
    const MIN_REFRESH_INTERVAL = 30000; // Minimum 30 seconds between refreshes

    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && now - lastRefreshTime > MIN_REFRESH_INTERVAL) {
        lastRefreshTime = now;
        fetchApprovedStudents();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
    return <Loading fullScreen size="lg" text="Loading approved students..." />;
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/dashboard">Dashboard</Link></li>
          <li className="breadcrumb-item"><Link to="/students">Students</Link></li>
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
                          <div className="student-fullname">{student.fullName}</div>
                        </div>
                      </td>
                      <td>
                        <div className="student-email">{student.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-department">
                          <FaBuilding className="badge-icon" />
                          {student.department_id?.name || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-course">
                          {student.course_id?.name || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-graduation-year">
                          <FaCalendarAlt className="badge-icon" />
                          {student.admissionYear || "N/A"}
                        </span>
                      </td>
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
              <Pagination
                page={page}
                totalPages={totalPages}
                setPage={setPage}
              />
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

        /* TABLE */
        .table-container {
          overflow-x: auto;
          border-radius: 12px;
        }

        .erp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
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
        }

        .erp-table tbody tr {
          transition: all 0.25s ease;
        }

        .erp-table tbody tr:hover {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.1);
        }

        .erp-table td {
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .student-name {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .student-fullname {
          font-weight: 700;
          color: #0f3a4a;
          font-size: 15px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        }

        .student-email {
          font-size: 13px;
          color: #64748b;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 8px 16px;
          border-radius: 24px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .status-approved {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
        }

        .status-icon {
          font-size: 12px;
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
        }

        .badge-icon {
          font-size: 12px;
        }

        .badge-department {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
        }

        .badge-course {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(15, 58, 74, 0.3);
        }

        .badge-graduation-year {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
        }

        .text-center {
          text-align: center;
        }

        .action-cell {
          text-align: center;
          min-width: 140px;
        }

        .action-btn {
          padding: 10px 18px;
          font-size: 13px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: none;
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          color: white;
          cursor: pointer;
          transition: all 0.25s ease;
          font-weight: 600;
          box-shadow: 0 3px 10px rgba(61, 181, 230, 0.3);
        }

        .view-btn:hover {
          background: linear-gradient(135deg, #0f3a4a 0%, #3db5e6 100%);
          box-shadow: 0 5px 15px rgba(61, 181, 230, 0.4);
          transform: translateY(-2px);
        }

        .view-btn:active {
          transform: translateY(-1px);
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