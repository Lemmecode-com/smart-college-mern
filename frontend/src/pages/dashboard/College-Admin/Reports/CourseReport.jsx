import { useEffect, useState, useMemo } from "react";
import api from "../../../../api/axios";
import {
  FaGraduationCap,
  FaChartPie,
  FaSyncAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaInfoCircle,
  FaDownload,
  FaUniversity,
  FaListOl,
  FaArrowUp,
  FaArrowDown,
  FaUsers
} from "react-icons/fa";

export default function CourseReports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /* ================= FETCH COURSE-WISE ADMISSIONS ================= */
  const fetchCourseReports = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/reports/admissions/course-wise");
      setData(Array.isArray(res.data) ? res.data : []);
      setRetryCount(0);
    } catch (err) {
      console.error("Course reports fetch error:", err);
      setError(err.response?.data?.message || "Failed to load course-wise admission data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseReports();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchCourseReports();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  };

  /* ================= CALCULATED METRICS ================= */
  const totalAdmissions = useMemo(() => 
    data.reduce((sum, course) => sum + (course.totalStudents || 0), 0), 
    [data]
  );

  const topCourse = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((max, course) => 
      (course.totalStudents || 0) > (max.totalStudents || 0) ? course : max
    );
  }, [data]);

  const courseCount = data.length;

  /* ================= EXPORT HANDLER ================= */
  const exportCSV = () => {
    if (data.length === 0) return;
    
    const headers = ["Course Name", "Total Students", "Percentage"];
    const rows = data.map(course => {
      const percentage = totalAdmissions > 0 
        ? ((course.totalStudents || 0) / totalAdmissions * 100).toFixed(1) 
        : "0.0";
      return [
        course.courseName || "N/A",
        course.totalStudents || 0,
        `${percentage}%`
      ];
    });

    let csvContent = "text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `course_admissions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-header-cell"></div>
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-table-row">
            <div className="skeleton-cell skeleton-text long"></div>
            <div className="skeleton-cell skeleton-text short"></div>
            <div className="skeleton-cell skeleton-text short"></div>
            <div className="skeleton-cell skeleton-bar"></div>
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
          <FaExclamationTriangle className="shake" />
        </div>
        <h3>Course Reports Error</h3>
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
  if (loading || data === null) {
    return (
      <div className="erp-loading-container">
        <div className="erp-loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h4 className="erp-loading-text">Loading course-wise admission reports...</h4>
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
          <li className="breadcrumb-item"><a href="/reports/admission">Admission Reports</a></li>
          <li className="breadcrumb-item active" aria-current="page">Course-wise Admissions</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon blink-pulse">
            <FaGraduationCap />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Course-wise Admission Analytics</h1>
            <p className="erp-page-subtitle">
              Detailed breakdown of student admissions across all courses
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-outline-primary"
            onClick={exportCSV}
            title="Export report data to CSV"
          >
            <FaDownload className="erp-btn-icon" />
            <span>Export CSV</span>
          </button>
          <button
            className="erp-btn erp-btn-secondary"
            onClick={fetchCourseReports}
            title="Refresh report data"
          >
            <FaSyncAlt className="erp-btn-icon spin" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* INFO BANNER */}
      <div className="info-banner animate-fade-in">
        <div className="info-icon">
          <FaUniversity className="pulse" />
        </div>
        <div className="info-content">
          <strong>Course Distribution Overview:</strong> This report provides a detailed breakdown of student admissions across all courses in your college. Data is updated in real-time.
        </div>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid animate-fade-in">
        {/* TOTAL ADMISSIONS */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper total">
              <FaUsers className="stat-icon" />
            </div>
            <div className="stat-title">Total Admissions</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{totalAdmissions?.toLocaleString() || 0}</div>
            <div className="stat-trend neutral">
              <FaGraduationCap className="trend-icon" />
              Across all courses
            </div>
          </div>
        </div>

        {/* TOP COURSE */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper top">
              <FaArrowUp className="stat-icon" />
            </div>
            <div className="stat-title">Top Course</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value top">{topCourse?.courseName || "N/A"}</div>
            <div className="stat-trend positive">
              <FaUsers className="trend-icon" />
              {topCourse?.totalStudents || 0} students
            </div>
          </div>
        </div>

        {/* TOTAL COURSES */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper courses">
              <FaListOl className="stat-icon" />
            </div>
            <div className="stat-title">Total Courses</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{courseCount}</div>
            <div className="stat-trend neutral">
              <FaUniversity className="trend-icon" />
              Active courses with admissions
            </div>
          </div>
        </div>
      </div>

      {/* COURSE TABLE */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaChartPie className="erp-card-icon" />
            Course-wise Admission Breakdown
          </h3>
          <span className="record-count">
            {data.length} {data.length === 1 ? "Course" : "Courses"}
          </span>
        </div>
        
        <div className="erp-card-body">
          {data.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaGraduationCap />
              </div>
              <h3>No Course Data Available</h3>
              <p className="empty-description">
                There are no course admissions recorded yet. Data will appear here once students are admitted to courses.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Course Name</th>
                    <th>Students</th>
                    <th>Percentage</th>
                    <th>Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((course, index) => {
                    const percentage = totalAdmissions > 0 
                      ? ((course.totalStudents || 0) / totalAdmissions * 100) 
                      : 0;
                    const isTop = topCourse?.courseName === course.courseName;
                    
                    return (
                      <tr key={index} className={isTop ? "top-course-row" : ""}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="course-name">
                            <div className={`course-badge ${isTop ? 'top-badge' : ''}`}>
                              {isTop && <FaArrowUp className="top-icon" />}
                              {course.courseName || "Unnamed Course"}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="student-count">
                            <FaUsers className="count-icon" />
                            {course.totalStudents?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td>
                          <div className="percentage-value">
                            {percentage.toFixed(1)}%
                          </div>
                        </td>
                        <td>
                          <div className="distribution-bar">
                            <div 
                              className="bar-fill" 
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: isTop ? '#4CAF50' : '#2196F3'
                              }}
                            ></div>
                            <div className="bar-label">
                              {course.totalStudents || 0}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* VISUAL SUMMARY */}
      {data.length > 0 && (
        <div className="erp-card animate-fade-in">
          <div className="erp-card-header">
            <h3>
              <FaChartPie className="erp-card-icon" />
              Visual Course Distribution
            </h3>
          </div>
          <div className="erp-card-body">
            <div className="visual-summary">
              {data.map((course, index) => {
                const percentage = totalAdmissions > 0 
                  ? ((course.totalStudents || 0) / totalAdmissions * 100) 
                  : 0;
                const isTop = topCourse?.courseName === course.courseName;
                
                return (
                  <div 
                    key={index} 
                    className="course-bar-container"
                    style={{ 
                      '--bar-color': isTop ? '#4CAF50' : '#2196F3',
                      '--bar-width': `${percentage}%`
                    }}
                  >
                    <div className="course-bar-label">
                      <span className="course-name-label">{course.courseName || "Unnamed Course"}</span>
                      <span className="course-value">{course.totalStudents || 0} students</span>
                    </div>
                    <div className="course-bar">
                      <div className="course-bar-fill"></div>
                      <div className="course-bar-percentage">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="summary-footer">
              <div className="summary-note">
                <FaInfoCircle className="note-icon" />
                <span>Visual representation of course-wise student distribution</span>
              </div>
              <div className="summary-legend">
                <span className="legend-item top">
                  <span className="legend-color top"></span>
                  Top Course
                </span>
                <span className="legend-item other">
                  <span className="legend-color other"></span>
                  Other Courses
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER NOTE */}
      <div className="footer-note animate-fade-in">
        <FaInfoCircle className="note-icon" />
        <span>
          This report shows course-wise admission distribution for your college. Data is automatically updated. 
          Last refreshed: {new Date().toLocaleString()}
        </span>
        <button 
          className="refresh-btn" 
          onClick={fetchCourseReports}
          title="Refresh data"
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
        
        /* INFO BANNER */
        .info-banner {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          border-left: 4px solid #2196F3;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15);
        }
        
        .info-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(33, 150, 243, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2196F3;
          flex-shrink: 0;
        }
        
        .info-content {
          flex: 1;
          font-size: 0.95rem;
          color: #0d47a1;
          line-height: 1.5;
        }
        
        .info-content strong {
          font-weight: 600;
        }
        
        /* STATS GRID */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
        
        .stat-icon-wrapper.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .stat-icon-wrapper.top { background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%); }
        .stat-icon-wrapper.courses { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); }
        
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
        
        .stat-value.top {
          color: #4CAF50;
          font-size: 1.75rem;
        }
        
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
        
        /* TABLE */
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
        
        .table-container {
          overflow-x: auto;
        }
        
        .erp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
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
        }
        
        .erp-table tbody tr {
          border-bottom: 1px solid #f0f2f5;
          transition: all 0.2s ease;
        }
        
        .erp-table tbody tr:hover {
          background: #f8f9ff;
        }
        
        .erp-table tbody tr.top-course-row {
          background: rgba(76, 175, 80, 0.05);
          border-left: 4px solid #4CAF50;
        }
        
        .erp-table td {
          padding: 1rem 1.25rem;
          color: #2c3e50;
          font-weight: 500;
          vertical-align: middle;
        }
        
        .course-name {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .course-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.95rem;
          background: #e3f2fd;
          color: #1976d2;
        }
        
        .course-badge.top-badge {
          background: rgba(76, 175, 80, 0.15);
          color: #4CAF50;
        }
        
        .top-icon {
          font-size: 0.85rem;
          color: #4CAF50;
        }
        
        .student-count {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: #1a4b6d;
        }
        
        .count-icon {
          color: #6c757d;
          font-size: 1rem;
        }
        
        .percentage-value {
          font-weight: 700;
          color: #4CAF50;
          font-size: 1.1rem;
        }
        
        .distribution-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          height: 28px;
        }
        
        .bar-fill {
          flex: 1;
          height: 100%;
          border-radius: 12px;
          background: #e9ecef;
          position: relative;
          overflow: hidden;
        }
        
        .bar-fill::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%);
          animation: shimmer 1.5s infinite;
        }
        
        .bar-label {
          min-width: 40px;
          text-align: right;
          font-weight: 600;
          color: #1a4b6d;
        }
        
        /* VISUAL SUMMARY */
        .visual-summary {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        
        .course-bar-container {
          --bar-color: #2196F3;
          --bar-width: 0%;
        }
        
        .course-bar-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }
        
        .course-name-label {
          font-weight: 600;
          color: #2c3e50;
        }
        
        .course-value {
          color: #6c757d;
          font-size: 0.9rem;
        }
        
        .course-bar {
          height: 24px;
          background: #f0f2f5;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .course-bar-fill {
          height: 100%;
          width: var(--bar-width);
          background: var(--bar-color);
          border-radius: 12px 0 0 12px;
          transition: width 0.8s ease;
        }
        
        .course-bar-percentage {
          position: absolute;
          right: 8px;
          color: white;
          font-weight: 600;
          font-size: 0.85rem;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        
        .summary-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid #f0f2f5;
          margin-top: 1rem;
        }
        
        .summary-note {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #6c757d;
        }
        
        .note-icon {
          font-size: 1rem;
          color: #1a4b6d;
        }
        
        .summary-legend {
          display: flex;
          gap: 1.5rem;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #6c757d;
        }
        
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 4px;
        }
        
        .legend-color.top { background: #4CAF50; }
        .legend-color.other { background: #2196F3; }
        
        /* FOOTER NOTE */
        .footer-note {
          background: #e8f5e9;
          border-radius: 12px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 1rem;
          border-left: 4px solid #4CAF50;
          font-size: 0.9rem;
          color: #1b5e20;
        }
        
        .note-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        
        .refresh-btn {
          background: rgba(76, 175, 80, 0.15);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4CAF50;
          cursor: pointer;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        
        .refresh-btn:hover {
          background: rgba(76, 175, 80, 0.25);
          transform: rotate(90deg);
        }
        
        .refresh-icon {
          font-size: 1.1rem;
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
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(25, 118, 210, 0.1) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2196F3;
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
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
        
        .skeleton-table {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .skeleton-table-header {
          display: grid;
          grid-template-columns: 60px 2fr 1fr 1fr 3fr;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        .skeleton-header-cell {
          height: 40px;
          background: #e9ecef;
        }
        
        .skeleton-table-row {
          display: grid;
          grid-template-columns: 60px 2fr 1fr 1fr 3fr;
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
        .skeleton-text.short { width: 40%; }
        .skeleton-bar { 
          width: 100%;
          border-radius: 12px;
          height: 24px;
        }
        
        @keyframes skeleton-loading {
          to { left: 100%; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
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
          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
          
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
          
          .visual-summary {
            gap: 0.75rem;
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
          }
          
          .erp-header-actions .erp-btn {
            flex: 1;
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
          
          .erp-table {
            min-width: 600px;
          }
          
          .bar-label {
            display: none;
          }
          
          .course-bar-percentage {
            right: 4px;
            font-size: 0.75rem;
          }
        }
        
        @media (max-width: 480px) {
          .stat-value {
            font-size: 1.75rem;
          }
          
          .stat-value.top {
            font-size: 1.5rem;
          }
          
          .erp-card-header h3 {
            font-size: 1.25rem;
          }
          
          .erp-page-title {
            font-size: 1.5rem;
          }
          
          .erp-table th,
          .erp-table td {
            padding: 0.75rem;
            font-size: 0.9rem;
          }
          
          .course-bar-label {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
          
          .course-value {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}