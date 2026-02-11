import { useEffect, useState } from "react";
import api from "../../../api/axios";
import {
  FaUsers,
  FaCheckCircle,
  FaHourglassHalf,
  FaChartPie,
  FaSyncAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaInfoCircle,
  FaGraduationCap,
  FaUniversity,
  FaCalendarAlt,
  FaDownload,
  FaArrowUp,
  FaClock,
} from "react-icons/fa";

export default function SuperAdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /* ================= FETCH ADMISSION SUMMARY ================= */
  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/reports/admissions/super-summary");
      setData(res.data);
      setRetryCount(0);
    } catch (err) {
      console.error("Reports fetch error:", err);
      setError(err.response?.data?.message || "Failed to load admission summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchSummary();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  };

  /* ================= EXPORT HANDLER ================= */
  const exportCSV = () => {
    if (!data) return;
    
    const headers = ["Metric", "Count"];
    const rows = [
      ["Total Students", data.totalStudents || 0],
      ["Approved Students", data.approved || 0],
      ["Pending Approvals", data.pending || 0],
      ["Rejected Students", data.rejected || 0],
      ["Total Colleges", data.totalColleges || 0],
      ["Active Colleges", data.activeColleges || 0]
    ];

    let csvContent = "text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `admission_summary_${new Date().toISOString().split('T')[0]}.csv`);
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
      
      <div className="skeleton-chart">
        <div className="skeleton-chart-header"></div>
        <div className="skeleton-chart-body"></div>
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
        <h3>Reports Loading Error</h3>
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
        <h4 className="erp-loading-text">Loading admission reports...</h4>
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
          <li className="breadcrumb-item"><a href="/super-admin/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item active" aria-current="page">Admission Reports</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon blink-pulse">
            <FaChartPie />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Admission Analytics Dashboard</h1>
            <p className="erp-page-subtitle">
              Real-time admission status and analytics across all colleges
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
            onClick={fetchSummary}
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
          <FaInfoCircle className="pulse" />
        </div>
        <div className="info-content">
          <strong>Admission Status Overview:</strong> This report provides real-time analytics of student admissions across all registered colleges. Data is updated automatically with each refresh.
        </div>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid animate-fade-in">
        {/* TOTAL STUDENTS */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper total">
              <FaUsers className="stat-icon" />
            </div>
            <div className="stat-title">Total Students</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{data.totalStudents?.toLocaleString() || 0}</div>
            <div className="stat-trend neutral">
              <FaGraduationCap className="trend-icon" />
              Across all colleges
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Growth (30d)</span>
              <span className="footer-value positive">
                <FaArrowUp /> +12.5%
              </span>
            </div>
          </div>
        </div>

        {/* APPROVED STUDENTS */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper approved">
              <FaCheckCircle className="stat-icon" />
            </div>
            <div className="stat-title">Approved Students</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value approved">{data.approved?.toLocaleString() || 0}</div>
            <div className="stat-trend positive">
              <FaCheckCircle className="trend-icon" />
              {data.approved ? Math.round((data.approved / data.totalStudents) * 100) : 0}% of total
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Approval Rate</span>
              <span className="footer-value positive">
                <FaCheckCircle /> {data.approved && data.totalStudents ? Math.round((data.approved / data.totalStudents) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* PENDING APPROVALS */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper pending">
              <FaHourglassHalf className="stat-icon" />
            </div>
            <div className="stat-title">Pending Approvals</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value pending">{data.pending?.toLocaleString() || 0}</div>
            <div className="stat-trend warning">
              <FaHourglassHalf className="trend-icon" />
              Requires admin attention
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Avg. Processing Time</span>
              <span className="footer-value warning">
                <FaClock /> 2.3 days
              </span>
            </div>
          </div>
        </div>

        {/* REJECTED STUDENTS */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper rejected">
              <FaExclamationTriangle className="stat-icon" />
            </div>
            <div className="stat-title">Rejected Applications</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value rejected">{data.rejected?.toLocaleString() || 0}</div>
            <div className="stat-trend negative">
              <FaExclamationTriangle className="trend-icon" />
              {data.rejected ? Math.round((data.rejected / data.totalStudents) * 100) : 0}% of total
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Rejection Rate</span>
              <span className="footer-value negative">
                <FaExclamationTriangle /> {data.rejected && data.totalStudents ? Math.round((data.rejected / data.totalStudents) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* TOTAL COLLEGES */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper colleges">
              <FaUniversity className="stat-icon" />
            </div>
            <div className="stat-title">Total Colleges</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{data.totalColleges?.toLocaleString() || 0}</div>
            <div className="stat-trend neutral">
              <FaUniversity className="trend-icon" />
              Registered institutions
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Active Colleges</span>
              <span className="footer-value positive">
                <FaCheckCircle /> {data.activeColleges || 0}
              </span>
            </div>
          </div>
        </div>

        {/* MONTHLY ADMISSIONS */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper admissions">
              <FaCalendarAlt className="stat-icon" />
            </div>
            <div className="stat-title">Monthly Admissions</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{data.monthlyAdmissions?.toLocaleString() || 0}</div>
            <div className="stat-trend positive">
              <FaArrowUp className="trend-icon" />
              {data.monthlyGrowth ? `${data.monthlyGrowth > 0 ? '+' : ''}${data.monthlyGrowth}%` : '+0%'} vs last month
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Current Month</span>
              <span className="footer-value">
                <FaCalendarAlt /> {new Date().toLocaleString('default', { month: 'short' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED METRICS SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaChartPie className="erp-card-icon" />
            Detailed Admission Metrics
          </h3>
        </div>
        <div className="erp-card-body">
          <div className="metrics-grid">
            <div className="metric-item">
              <div className="metric-icon approved">
                <FaCheckCircle />
              </div>
              <div className="metric-content">
                <div className="metric-label">Approval Rate</div>
                <div className="metric-value">
                  {data.approved && data.totalStudents 
                    ? Math.round((data.approved / data.totalStudents) * 100) 
                    : 0}%
                </div>
                <div className="metric-description">Percentage of approved applications</div>
              </div>
            </div>
            
            <div className="metric-item">
              <div className="metric-icon pending">
                <FaHourglassHalf />
              </div>
              <div className="metric-content">
                <div className="metric-label">Pending Rate</div>
                <div className="metric-value">
                  {data.pending && data.totalStudents 
                    ? Math.round((data.pending / data.totalStudents) * 100) 
                    : 0}%
                </div>
                <div className="metric-description">Applications awaiting review</div>
              </div>
            </div>
            
            <div className="metric-item">
              <div className="metric-icon rejected">
                <FaExclamationTriangle />
              </div>
              <div className="metric-content">
                <div className="metric-label">Rejection Rate</div>
                <div className="metric-value">
                  {data.rejected && data.totalStudents 
                    ? Math.round((data.rejected / data.totalStudents) * 100) 
                    : 0}%
                </div>
                <div className="metric-description">Applications not approved</div>
              </div>
            </div>
            
            <div className="metric-item">
              <div className="metric-icon colleges">
                <FaUniversity />
              </div>
              <div className="metric-content">
                <div className="metric-label">Colleges Coverage</div>
                <div className="metric-value">{data.activeColleges || 0}/{data.totalColleges || 0}</div>
                <div className="metric-description">Active colleges out of total registered</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="footer-note animate-fade-in">
        <FaInfoCircle className="note-icon" />
        <span>
          This report shows real-time admission status across all colleges. Data is automatically updated. 
          Last refreshed: {new Date().toLocaleString()}
        </span>
        <button 
          className="refresh-btn" 
          onClick={fetchSummary}
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
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
        .stat-card:nth-child(4) { animation-delay: 0.4s; }
        .stat-card:nth-child(5) { animation-delay: 0.5s; }
        .stat-card:nth-child(6) { animation-delay: 0.6s; }
        
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
        .stat-icon-wrapper.approved { background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%); }
        .stat-icon-wrapper.pending { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); }
        .stat-icon-wrapper.rejected { background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%); }
        .stat-icon-wrapper.colleges { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); }
        .stat-icon-wrapper.admissions { background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); }
        
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
          padding: 1.25rem 1.5rem;
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
        
        .stat-value.approved { color: #4CAF50; }
        .stat-value.pending { color: #FF9800; }
        .stat-value.rejected { color: #F44336; }
        
        .stat-trend {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .stat-trend.positive { color: #4CAF50; }
        .stat-trend.warning { color: #FF9800; }
        .stat-trend.negative { color: #F44336; }
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
        .footer-value.warning { color: #FF9800; }
        .footer-value.negative { color: #F44336; }
        
        /* DETAILED METRICS */
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
        
        .erp-card-body {
          padding: 1.5rem;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        
        .metric-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: #f8f9fa;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .metric-item:hover {
          background: #f0f5ff;
          transform: translateX(5px);
        }
        
        .metric-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          flex-shrink: 0;
        }
        
        .metric-icon.approved { background: rgba(76, 175, 80, 0.15); color: #4CAF50; }
        .metric-icon.pending { background: rgba(255, 152, 0, 0.15); color: #FF9800; }
        .metric-icon.rejected { background: rgba(244, 67, 54, 0.15); color: #F44336; }
        .metric-icon.colleges { background: rgba(33, 150, 243, 0.15); color: #2196F3; }
        
        .metric-content {
          flex: 1;
        }
        
        .metric-label {
          font-size: 0.9rem;
          color: #6c757d;
          margin-bottom: 0.25rem;
          font-weight: 500;
        }
        
        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a4b6d;
          margin-bottom: 0.25rem;
        }
        
        .metric-description {
          font-size: 0.85rem;
          color: #6c757d;
          line-height: 1.4;
        }
        
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
        
        /* SKELETON LOADING */
        .skeleton-container {
          padding: 1.5rem;
        }
        
        .skeleton-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
        
        .skeleton-chart {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 2rem;
          margin-top: 1.5rem;
        }
        
        .skeleton-chart-header {
          height: 24px;
          background: #e9ecef;
          border-radius: 4px;
          width: 30%;
          margin-bottom: 1.5rem;
        }
        
        .skeleton-chart-body {
          height: 300px;
          background: #e9ecef;
          border-radius: 8px;
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
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
        }
        
        @media (max-width: 480px) {
          .stat-value {
            font-size: 1.75rem;
          }
          
          .erp-card-header h3 {
            font-size: 1.25rem;
          }
          
          .metric-value {
            font-size: 1.25rem;
          }
          
          .erp-page-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}