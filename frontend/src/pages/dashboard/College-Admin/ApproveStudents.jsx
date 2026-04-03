import { useContext, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Pagination from "../../../components/Pagination";
import Breadcrumb from "../../../components/Breadcrumb";

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
  FaEnvelope,
  FaUsers
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
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Students", path: "/students" },
          { label: "Approved Students" }
        ]}
      />

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
                    <th className="th-student">
                      <FaUserCheck className="header-icon" /> Student Name
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
                        <span className="badge badge-status">
                          <FaCheckCircle className="badge-icon" />
                          APPROVED
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="action-buttons">
                          <button
                            className="btn btn-action btn-view-student"
                            onClick={() => navigate(`/college/view-approved-student/${student._id}`)}
                            title="View Student Details"
                          >
                            <FaEye />
                            <span className="btn-text">View</span>
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

      {/* STYLES */}
      <style>{`
        /* ================= GLOBAL TYPOGRAPHY ================= */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          animation: fadeIn 0.6s ease;
        }

        /* ================= PAGE HEADER ================= */
        .erp-page-header {
          background: linear-gradient(135deg, #0f3a4a 0%, #1c6f86 100%);
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 24px rgba(15, 58, 74, 0.3);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideDown 0.6s ease;
        }

        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .erp-header-icon {
          width: 64px;
          height: 64px;
          background: rgba(61, 181, 230, 0.15);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: #3db5e6;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(61, 181, 230, 0.3);
        }

        .erp-page-title {
          margin: 0;
          font-size: 1.875rem;
          font-weight: 700;
          font-family: 'Poppins', sans-serif;
          letter-spacing: -0.5px;
        }

        .erp-page-subtitle {
          margin: 0.375rem 0 0 0;
          opacity: 0.9;
          font-size: 1rem;
          font-weight: 400;
        }

        /* ================= STATS GRID ================= */
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
          border: 1px solid #e2e8f0;
          border-left: 4px solid #3db5e6;
          transition: all 0.3s ease;
          height: 100px;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 28px rgba(15, 58, 74, 0.15);
          border-color: #3db5e6;
        }

        .stat-card-icon {
          width: 56px;
          height: 56px;
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
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 0.375rem;
          font-family: 'Inter', sans-serif;
        }

        .stat-card-value {
          font-size: 2rem;
          font-weight: 700;
          color: #0f3a4a;
          line-height: 1;
          font-family: 'Poppins', sans-serif;
        }
        
        /* ================= CONTROLS CARD ================= */
        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
        }

        .erp-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
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
          font-family: 'Poppins', sans-serif;
        }

        .erp-card-icon {
          color: #3db5e6;
          font-size: 1.25rem;
        }

        .record-count {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: white;
          padding: 0.375rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2);
        }

        .erp-card-body {
          padding: 0;
        }

        .controls-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 320px;
          max-width: 500px;
        }

        .search-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 1rem;
        }

        .search-box input {
          width: 100%;
          padding: 0.875rem 1.25rem 0.875rem 2.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
        }

        .search-box input:focus {
          border-color: #3db5e6;
          box-shadow: 0 0 0 0.25rem rgba(61, 181, 230, 0.1);
          outline: none;
        }

        .search-box input::placeholder {
          color: #94a3b8;
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

        .th-year,
        .cell-year {
          min-width: 150px;
        }

        .th-status,
        .cell-status {
          min-width: 140px;
        }

        .th-actions,
        .cell-actions {
          min-width: 140px;
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

        .badge-graduation-year {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
        }

        .badge-status {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
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

        .btn-text {
          margin-left: 4px;
        }
        
        /* ================= PAGINATION ================= */
        .erp-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
          gap: 0.5rem;
        }

        .page-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #0f3a4a;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
        }

        .page-btn:hover:not(:disabled) {
          background: #f6fbff;
          border-color: #3db5e6;
          transform: translateY(-1px);
        }

        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-btn.active {
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          color: white;
          border-color: transparent;
          box-shadow: 0 3px 10px rgba(61, 181, 230, 0.3);
        }

        .page-numbers {
          display: flex;
          gap: 0.375rem;
        }

        /* ================= EMPTY STATE ================= */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
        }

        .empty-icon {
          width: 96px;
          height: 96px;
          margin: 0 auto 2rem;
          background: linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(4, 120, 87, 0.08) 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #059669;
          font-size: 3rem;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          color: #0f3a4a;
          margin-bottom: 0.75rem;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
        }

        .empty-description {
          font-size: 1rem;
          margin-bottom: 1.5rem;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
          color: #64748b;
          line-height: 1.6;
          font-family: 'Inter', sans-serif;
        }

        /* ================= ERROR CONTAINER ================= */
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
          background: rgba(239, 68, 68, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: #ef4444;
          font-size: 3rem;
        }

        .erp-error-container h3 {
          font-size: 1.75rem;
          color: #0f3a4a;
          margin-bottom: 1rem;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
        }

        .erp-error-container p {
          color: #64748b;
          font-size: 1rem;
          max-width: 500px;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          font-family: 'Inter', sans-serif;
        }

        .error-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        /* ================= ANIMATIONS ================= */
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

        /* ================= RESPONSIVE DESIGN ================= */
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

          .erp-header-content {
            gap: 1rem;
          }

          .erp-header-icon {
            width: 56px;
            height: 56px;
            font-size: 1.75rem;
          }

          .erp-page-title {
            font-size: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 1rem;
          }

          .stat-card {
            padding: 1.25rem;
            height: auto;
          }

          .stat-card-icon {
            width: 48px;
            height: 48px;
            font-size: 1.25rem;
          }

          .stat-card-value {
            font-size: 1.75rem;
          }

          .erp-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.25rem 1.5rem;
          }

          .record-count {
            align-self: flex-end;
          }

          .controls-container {
            padding: 1.25rem 1.5rem;
          }

          .search-box {
            min-width: 100%;
          }

          .erp-table {
            min-width: 650px;
          }

          .erp-table th {
            padding: 14px 16px;
            font-size: 11px;
          }

          .erp-table td {
            padding: 16px 16px;
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
            width: 80px;
            height: 80px;
            font-size: 2.5rem;
          }

          .empty-state h3 {
            font-size: 1.25rem;
          }

          .btn-action {
            padding: 8px 14px;
            font-size: 12px;
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

          .erp-table th {
            padding: 12px 14px;
            font-size: 10px;
          }

          .erp-table td {
            padding: 14px 14px;
          }
        }
      `}</style>
    </div>
  );
}