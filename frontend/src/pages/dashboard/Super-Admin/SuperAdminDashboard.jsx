import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaUniversity,
  FaUsers,
  FaUserGraduate,
  FaTachometerAlt,
  FaSyncAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaInfoCircle,
  FaDownload,
  FaChartPie,
  FaListOl,
  FaPlus,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaBuilding,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaDatabase,
  FaChevronRight,
  FaCog,
  FaCheckCircle
} from "react-icons/fa";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /* ================= FETCH DASHBOARD DATA ================= */
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/dashboard/super-admin");
      setData(res.data || { stats: {}, colleges: [] });
      setRetryCount(0);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.response?.data?.message || "Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchDashboardData();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  };

  /* ================= CALCULATED METRICS ================= */
  const stats = useMemo(() => data?.stats || { totalColleges: 0, totalStudents: 0, totalTeachers: 0 }, [data]);
  const colleges = useMemo(() => data?.colleges || [], [data]);
  const collegeCount = colleges.length;
  const collegesToDisplay = useMemo(() => colleges.slice(0, 3), [colleges]);
  const showViewMore = collegeCount > 3;

  /* ================= LOADING SKELETON ================= */
  const renderSkeleton = () => (
    <div className="skeleton-container">
      <div className="skeleton-stats-grid">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-stat-card">
            <div className="skeleton-stat-icon"></div>
            <div className="skeleton-stat-content">
              <div className="skeleton-stat-label"></div>
              <div className="skeleton-stat-value"></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="skeleton-colleges-section">
        <div className="skeleton-section-header"></div>
        <div className="skeleton-colleges-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-college-card"></div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <div className="erp-error-container">
        <div className="erp-error-icon">
          <FaExclamationTriangle className="shake" />
        </div>
        <h3>Dashboard Loading Error</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button 
            className="erp-btn erp-btn-secondary" 
            onClick={() => window.history.back()}
          >
            <FaArrowLeft className="erp-btn-icon" />
            Go Back
          </button>
          <button 
            className="erp-btn erp-btn-primary" 
            onClick={handleRetry}
            disabled={retryCount >= 3}
          >
            <FaSyncAlt className="erp-btn-icon spin" />
            {retryCount >= 3 ? "Max Retries" : `Retry (${retryCount}/3)`}
          </button>
        </div>
      </div>
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading || !data) {
    return (
      <div className="erp-loading-container">
        <div className="erp-loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h4 className="erp-loading-text">Loading Super Admin Dashboard...</h4>
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
          <li className="breadcrumb-item active" aria-current="page">Dashboard</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon blink-pulse">
            <FaUniversity />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Super Admin Dashboard</h1>
            <p className="erp-page-subtitle">
              Centralized management portal for all registered colleges and institutional analytics
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={fetchDashboardData}
            title="Refresh dashboard data"
          >
            <FaSyncAlt className="erp-btn-icon spin" />
            <span>Refresh</span>
          </button>
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => navigate("/super-admin/create-college")}
            title="Add new college"
          >
            <FaPlus className="erp-btn-icon" />
            <span>Add College</span>
          </button>
        </div>
      </div>

      {/* INFO BANNER */}
      <div className="info-banner animate-fade-in">
        <div className="info-icon">
          <FaDatabase className="pulse" />
        </div>
        <div className="info-content">
          <strong>System Overview:</strong> This dashboard provides a centralized view of all registered colleges, student populations, and faculty statistics across your educational network. Data is updated in real-time.
        </div>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid animate-fade-in">
        {/* TOTAL COLLEGES */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper colleges">
              <FaUniversity className="stat-icon" />
            </div>
            <div className="stat-title">Total Colleges</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{stats.totalColleges?.toLocaleString() || "0"}</div>
            <div className="stat-trend neutral">
              <FaBuilding className="trend-icon" />
              Registered institutions
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Active Colleges</span>
              <span className="footer-value positive">
                <FaCheckCircle /> {collegeCount}
              </span>
            </div>
          </div>
        </div>

        {/* TOTAL STUDENTS */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper students">
              <FaUsers className="stat-icon" />
            </div>
            <div className="stat-title">Total Students</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value students">{stats.totalStudents?.toLocaleString() || "0"}</div>
            <div className="stat-trend positive">
              <FaGraduationCap className="trend-icon" />
              Across all colleges
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Avg. Per College</span>
              <span className="footer-value">
                {collegeCount > 0 ? Math.round(stats.totalStudents / collegeCount).toLocaleString() : "0"}
              </span>
            </div>
          </div>
        </div>

        {/* TOTAL TEACHERS */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper teachers">
              <FaUserGraduate className="stat-icon" />
            </div>
            <div className="stat-title">Total Teachers</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value teachers">{stats.totalTeachers?.toLocaleString() || "0"}</div>
            <div className="stat-trend positive">
              <FaUserGraduate className="trend-icon" />
              Faculty members
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Student-Teacher Ratio</span>
              <span className="footer-value">
                {stats.totalTeachers > 0 
                  ? `${Math.round(stats.totalStudents / stats.totalTeachers)}:1` 
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* COLLEGES SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaListOl className="erp-card-icon" />
            Registered Colleges ({collegeCount})
          </h3>
          {showViewMore && (
            <button
              className="view-more-btn"
              onClick={() => navigate("/super-admin/colleges-list")}
              aria-label="View all colleges"
            >
              View All Colleges
              <FaChevronRight className="view-more-icon" />
            </button>
          )}
        </div>
        
        <div className="erp-card-body">
          {colleges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaUniversity />
              </div>
              <h3>No Colleges Registered</h3>
              <p className="empty-description">
                There are no colleges registered in the system yet. Click "Add College" to register your first institution.
              </p>
              <button 
                className="erp-btn erp-btn-primary empty-action"
                onClick={() => navigate("/super-admin/create-college")}
              >
                <FaPlus className="erp-btn-icon" />
                Add First College
              </button>
            </div>
          ) : (
            <div className="colleges-grid">
              {collegesToDisplay.map((college, index) => (
                <div 
                  key={college._id} 
                  className="college-card"
                  onClick={() => navigate(`/super-admin/colleges/view/${college._id}`)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${college.name}`}
                >
                  <div className="college-card-header">
                    <div className="college-badge">
                      <span>{index + 1}</span>
                    </div>
                    <div className="college-status">
                      <span className="status-active">Active</span>
                    </div>
                  </div>
                  
                  <div className="college-card-body">
                    <h4 className="college-name">{college.name || "Unnamed College"}</h4>
                    <div className="college-meta">
                      <div className="meta-item">
                        <FaMapMarkerAlt className="meta-icon" />
                        <span>Pune, Maharashtra</span>
                      </div>
                      <div className="meta-item">
                        <FaCalendarAlt className="meta-icon" />
                        <span>Since 2024</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="college-card-footer">
                    <button 
                      className="view-details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/super-admin/colleges/view/${college._id}`);
                      }}
                      aria-label={`View details for ${college.name}`}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaTachometerAlt className="erp-card-icon" />
            Quick Actions
          </h3>
        </div>
        <div className="erp-card-body">
          <div className="quick-actions-grid">
            <div 
              className="quick-action-card"
              onClick={() => navigate("/super-admin/create-college")}
              role="button"
              tabIndex={0}
              aria-label="Add new college"
            >
              <div className="quick-action-icon add-college">
                <FaPlus />
              </div>
              <div className="quick-action-content">
                <div className="quick-action-title">Add New College</div>
                <div className="quick-action-description">Register a new educational institution</div>
              </div>
            </div>
            
            <div 
              className="quick-action-card"
              onClick={() => navigate("/super-admin/reports/admission")}
              role="button"
              tabIndex={0}
              aria-label="View admission reports"
            >
              <div className="quick-action-icon reports">
                <FaChartPie />
              </div>
              <div className="quick-action-content">
                <div className="quick-action-title">Admission Reports</div>
                <div className="quick-action-description">View analytics across all colleges</div>
              </div>
            </div>
            
            <div 
              className="quick-action-card"
              onClick={() => navigate("/super-admin/settings")}
              role="button"
              tabIndex={0}
              aria-label="System settings"
            >
              <div className="quick-action-icon settings">
                <FaCog />
              </div>
              <div className="quick-action-content">
                <div className="quick-action-title">System Settings</div>
                <div className="quick-action-description">Configure global system parameters</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="footer-note animate-fade-in">
        <FaInfoCircle className="note-icon" />
        <span>
          Super Admin Dashboard - Centralized management portal for educational institutions. 
          Last refreshed: {new Date().toLocaleString()}
        </span>
        <button 
          className="refresh-btn" 
          onClick={fetchDashboardData}
          title="Refresh data"
          aria-label="Refresh dashboard data"
        >
          <FaSyncAlt className="refresh-icon spin" />
        </button>
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
        
        .erp-header-actions {
          display: flex;
          gap: 0.75rem;
        }
        
        .erp-header-actions .erp-btn {
          background: white;
          color: #1a4b6d;
          border: none;
          padding: 0.75rem 1.25rem;
          font-weight: 600;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .erp-header-actions .erp-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        }
        
        .erp-btn-outline-primary {
          background: transparent;
          border: 2px solid white;
          color: white;
        }
        
        .erp-btn-outline-primary:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        .erp-btn-secondary {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: none;
        }
        
        .erp-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        
        .erp-btn-primary {
          background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%);
          color: white;
          border: none;
        }
        
        .erp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
          background: linear-gradient(135deg, #43A047 0%, #388E3C 100%);
        }
        
        /* INFO BANNER */
        .info-banner {
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          border-left: 4px solid #4CAF50;
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);
        }
        
        .info-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(76, 175, 80, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4CAF50;
          flex-shrink: 0;
        }
        
        .info-content {
          flex: 1;
          font-size: 0.95rem;
          color: #1b5e20;
          line-height: 1.5;
        }
        
        .info-content strong {
          font-weight: 600;
        }
        
        /* STATS GRID */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .stat-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.5s ease forwards;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.3s; }
        
        .stat-card-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 1px solid #f0f2f5;
        }
        
        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1.5rem;
        }
        
        .stat-icon-wrapper.colleges { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .stat-icon-wrapper.students { background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%); }
        .stat-icon-wrapper.teachers { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); }
        
        .stat-icon {
          color: white;
          font-size: 1.4rem;
        }
        
        .stat-title {
          font-weight: 600;
          color: #2c3e50;
          font-size: 1.05rem;
        }
        
        .stat-card-body {
          padding: 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .stat-value {
          font-size: 2.25rem;
          font-weight: 800;
          color: #1a4b6d;
          line-height: 1;
          margin-bottom: 0.5rem;
        }
        
        .stat-value.students { color: #4CAF50; }
        .stat-value.teachers { color: #2196F3; }
        
        .stat-trend {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .stat-trend.positive { color: #4CAF50; }
        .stat-trend.neutral { color: #6c757d; }
        
        .trend-icon {
          font-size: 0.95rem;
        }
        
        .stat-card-footer {
          padding: 0.75rem 1.5rem;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
          font-size: 0.875rem;
        }
        
        .stat-footer-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .footer-label {
          color: #6c757d;
        }
        
        .footer-value {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        
        .footer-value.positive { color: #4CAF50; }
        
        /* COLLEGES SECTION */
        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
          overflow: hidden;
          animation: fadeIn 0.6s ease;
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
        
        .view-more-btn {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(26, 75, 109, 0.3);
        }
        
        .view-more-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(26, 75, 109, 0.4);
        }
        
        .view-more-icon {
          font-size: 0.9rem;
          transition: transform 0.3s ease;
        }
        
        .view-more-btn:hover .view-more-icon {
          transform: translateX(3px);
        }
        
        .erp-card-body {
          padding: 1.5rem;
        }
        
        .colleges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: {showViewMore ? '1.5rem' : '0'};
        }
        
        .college-card {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid #e9ecef;
          position: relative;
          overflow: hidden;
        }
        
        .college-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          border-color: #1a4b6d;
          background: #f0f5ff;
        }
        
        .college-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, #1a4b6d 0%, #0f3a4a 100%);
        }
        
        .college-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e9ecef;
        }
        
        .college-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        
        .college-status {
          background: rgba(76, 175, 80, 0.15);
          color: #4CAF50;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.85rem;
        }
        
        .college-card-body {
          margin-bottom: 1rem;
        }
        
        .college-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a4b6d;
          margin: 0 0 0.75rem 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .college-meta {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #6c757d;
        }
        
        .meta-icon {
          color: #1a4b6d;
          font-size: 0.95rem;
        }
        
        .college-card-footer {
          padding-top: 0.75rem;
          border-top: 1px solid #e9ecef;
        }
        
        .view-details-btn {
          width: 100%;
          padding: 0.625rem;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .view-details-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(26, 75, 109, 0.3);
          background: linear-gradient(135deg, #0f3a4a 0%, #0a2a36 100%);
        }
        
        /* VIEW MORE CONTAINER */
        .view-more-container {
          display: flex;
          justify-content: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #f0f2f5;
        }
        
        .view-more-btn-large {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 16px;
          padding: 1.25rem 2rem;
          width: 100%;
          max-width: 500px;
          cursor: pointer;
          transition: all 0.4s ease;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.35);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .view-more-btn-large:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.45);
        }
        
        .view-more-btn-large:active {
          transform: translateY(0) scale(1);
        }
        
        .view-more-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        
        .view-more-count {
          background: rgba(255, 255, 255, 0.25);
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 800;
          flex-shrink: 0;
        }
        
        .view-more-text {
          text-align: left;
        }
        
        .view-more-text span:first-child {
          font-size: 1.25rem;
          font-weight: 700;
          display: block;
          margin-bottom: 0.25rem;
        }
        
        .view-more-subtext {
          font-size: 0.95rem;
          opacity: 0.9;
          font-weight: 500;
        }
        
        .view-more-arrow {
          font-size: 1.5rem;
          margin-left: 1rem;
          transition: transform 0.3s ease;
        }
        
        .view-more-btn-large:hover .view-more-arrow {
          transform: translateX(5px);
        }
        
        /* QUICK ACTIONS */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        
        .quick-action-card {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid #e9ecef;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        
        .quick-action-card:hover {
          transform: translateX(5px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
          border-color: #1a4b6d;
          background: #f0f5ff;
        }
        
        .quick-action-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          flex-shrink: 0;
        }
        
        .quick-action-icon.add-college { background: rgba(76, 175, 80, 0.15); color: #4CAF50; }
        .quick-action-icon.view-colleges { background: rgba(102, 126, 234, 0.15); color: #667eea; }
        .quick-action-icon.reports { background: rgba(33, 150, 243, 0.15); color: #2196F3; }
        .quick-action-icon.settings { background: rgba(156, 39, 176, 0.15); color: #9c27b0; }
        
        .quick-action-content {
          flex: 1;
        }
        
        .quick-action-title {
          font-weight: 700;
          color: #1a4b6d;
          font-size: 1.05rem;
          margin-bottom: 0.25rem;
        }
        
        .quick-action-description {
          font-size: 0.9rem;
          color: #6c757d;
          line-height: 1.4;
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
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #667eea;
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
        
        .empty-action {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          border: none;
          padding: 0.875rem 2rem;
          font-size: 1.05rem;
          font-weight: 600;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(26, 75, 109, 0.4);
        }
        
        .empty-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.5);
        }
        
        /* FOOTER NOTE */
        .footer-note {
          background: #e3f2fd;
          border-radius: 12px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 1rem;
          border-left: 4px solid #2196F3;
          font-size: 0.9rem;
          color: #0d47a1;
        }
        
        .note-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        
        .refresh-btn {
          background: rgba(33, 150, 243, 0.15);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2196F3;
          cursor: pointer;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        
        .refresh-btn:hover {
          background: rgba(33, 150, 243, 0.25);
          transform: rotate(90deg);
        }
        
        .refresh-icon {
          font-size: 1.1rem;
        }
        
        /* SKELETON LOADING */
        .skeleton-container {
          padding: 1.5rem;
        }
        
        .skeleton-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .skeleton-stat-card {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        
        .skeleton-stat-icon {
          width: 48px;
          height: 48px;
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
          height: 32px;
          background: #e9ecef;
          border-radius: 4px;
          width: 40%;
        }
        
        .skeleton-colleges-section {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 1.5rem;
        }
        
        .skeleton-section-header {
          height: 32px;
          background: #e9ecef;
          border-radius: 8px;
          width: 40%;
          margin-bottom: 1.5rem;
        }
        
        .skeleton-colleges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        
        .skeleton-college-card {
          height: 180px;
          background: #e9ecef;
          border-radius: 16px;
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
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes blink-pulse {
          0%, 100% { 
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(26, 75, 109, 0.5);
          }
          50% { 
            opacity: 0.7;
            box-shadow: 0 0 15px 5px rgba(26, 75, 109, 0.7);
          }
        }
        
        @keyframes progressPulse {
          0%, 100% { width: 35%; }
          50% { width: 65%; }
        }
        
        .blink {
          animation: blink 1.5s infinite;
        }
        
        .blink-pulse {
          animation: blink-pulse 2s ease-in-out infinite;
        }
        
        .pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 992px) {
          .erp-header-actions {
            flex-direction: column;
            width: 100%;
          }
          
          .erp-header-actions .erp-btn {
            width: 100%;
            justify-content: center;
          }
          
          .info-banner {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }
          
          .colleges-grid,
          .quick-actions-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          }
          
          .view-more-btn {
            width: 100%;
            justify-content: center;
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
          
          .erp-header-actions {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0.75rem;
          }
          
          .erp-header-actions .erp-btn {
            flex: 1;
            min-width: 120px;
            justify-content: center;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .footer-note {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }
          
          .refresh-btn {
            align-self: center;
          }
          
          .colleges-grid,
          .quick-actions-grid {
            grid-template-columns: 1fr;
          }
          
          .college-name {
            font-size: 1.1rem;
          }
          
          .view-more-btn-large {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
            padding: 1.5rem;
          }
          
          .view-more-content {
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .view-more-text span:first-child {
            font-size: 1.15rem;
          }
          
          .view-more-subtext {
            font-size: 0.9rem;
          }
          
          .view-more-arrow {
            margin-left: 0;
            margin-top: 0.5rem;
          }
        }
        
        @media (max-width: 480px) {
          .stat-value {
            font-size: 1.75rem;
          }
          
          .erp-card-header h3 {
            font-size: 1.25rem;
          }
          
          .erp-page-title {
            font-size: 1.5rem;
          }
          
          .college-card {
            padding: 1.25rem;
          }
          
          .college-name {
            font-size: 1rem;
          }
          
          .view-details-btn {
            font-size: 0.85rem;
            padding: 0.5rem;
          }
          
          .quick-action-card {
            flex-direction: column;
            text-align: center;
            padding: 1.25rem;
          }
          
          .quick-action-icon {
            width: 48px;
            height: 48px;
            font-size: 1.5rem;
          }
          
          .quick-action-title {
            font-size: 1rem;
          }
          
          .view-more-count {
            width: 48px;
            height: 48px;
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}