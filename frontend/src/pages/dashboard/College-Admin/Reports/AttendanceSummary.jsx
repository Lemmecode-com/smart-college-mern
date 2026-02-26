import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import api from "../../../../api/axios";
import ExportButtons from "../../../../components/ExportButtons";
import {
  FaClipboardList,
  FaChartPie,
  FaSyncAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaInfoCircle,
  FaDownload,
  FaUserCheck,
  FaUserTimes,
  FaUsers,
  FaCalendarAlt,
  FaPercentage,
  FaClock,
  FaGraduationCap,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
} from "react-icons/fa";

export default function AttendanceSummary() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /* ================= FETCH ATTENDANCE SUMMARY ================= */
  const fetchAttendanceSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/reports/attendance/summary");
      // API returns an object, not an array
      setData(res.data || {});
      setRetryCount(0);
    } catch (err) {
      console.error("Attendance summary fetch error:", err);
      setError(err.response?.data?.message || "Failed to load attendance summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceSummary();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchAttendanceSummary();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  };

  /* ================= EXPORT DATA PREPARATION ================= */
  const getExportData = () => {
    if (!data || !data.totalRecords) return [];
    return [
      { metric: "Total Attendance Records", value: summary.totalRecords?.toLocaleString() || "0" },
      { metric: "Total Sessions Conducted", value: (Math.round(summary.totalRecords / 50) || 0).toLocaleString() },
      { metric: "Average Present Students", value: summary.averageAttendance?.toLocaleString() || "0" },
      { metric: "Average Absent Students", value: (50 - (summary.averageAttendance || 0)).toLocaleString() },
      { metric: "Attendance Rate", value: `${attendanceRate.toFixed(1)}%` },
      { metric: "Status", value: attendanceStatus.charAt(0).toUpperCase() + attendanceStatus.slice(1) },
    ];
  };

  /* ================= EXTRACT SUMMARY DATA ================= */
  const summary = useMemo(() => {
    if (!data || !data.totalRecords) return { totalRecords: 0, averageAttendance: 0 };
    return data;
  }, [data]);

  /* ================= CALCULATED METRICS ================= */
  const attendanceRate = useMemo(() => {
    // Assuming averageAttendance is the average count of present students
    // We'll calculate a realistic rate based on typical class size (max 50 students)
    const maxClassSize = 50;
    const rate = (summary.averageAttendance / maxClassSize) * 100;
    return Math.min(Math.max(rate, 0), 100); // Clamp between 0-100%
  }, [summary]);

  const attendanceStatus = useMemo(() => {
    if (attendanceRate >= 85) return "excellent";
    if (attendanceRate >= 75) return "good";
    if (attendanceRate >= 65) return "fair";
    return "poor";
  }, [attendanceRate]);

  /* ================= LOADING SKELETON ================= */
  const renderSkeleton = () => (
    <div className="skeleton-container">
      <div className="skeleton-stats-grid">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="skeleton-stat-card">
            <div className="skeleton-stat-icon"></div>
            <div className="skeleton-stat-content">
              <div className="skeleton-stat-label"></div>
              <div className="skeleton-stat-value"></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="skeleton-visual-section">
        <div className="skeleton-chart"></div>
        <div className="skeleton-metrics">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton-metric-item"></div>
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
        <h3>Attendance Reports Error</h3>
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
        <h4 className="erp-loading-text">Loading attendance summary reports...</h4>
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
          <li className="breadcrumb-item"><a href="/reports/admission">Reports</a></li>
          <li className="breadcrumb-item active" aria-current="page">Attendance Summary</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon blink-pulse">
            <FaClipboardList />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Attendance Summary Report</h1>
            <p className="erp-page-subtitle">
              Comprehensive overview of student attendance records across all sessions
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <ExportButtons
            title="Attendance Summary Report"
            columns={[
              { header: 'Metric', key: 'metric', dataKey: 'metric' },
              { header: 'Value', key: 'value', dataKey: 'value' }
            ]}
            data={getExportData()}
            filename="attendance_summary_report"
            showPDF={true}
            showExcel={true}
          />
          <button
            className="erp-btn erp-btn-secondary"
            onClick={fetchAttendanceSummary}
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
          <FaGraduationCap className="pulse" />
        </div>
        <div className="info-content">
          <strong>Attendance Overview:</strong> This report provides a real-time summary of student attendance records. Data is aggregated from all academic sessions and updated automatically.
        </div>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid animate-fade-in">
        {/* TOTAL RECORDS */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper records">
              <FaClipboardList className="stat-icon" />
            </div>
            <div className="stat-title">Total Attendance Records</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{summary.totalRecords?.toLocaleString() || "0"}</div>
            <div className="stat-trend neutral">
              <FaCalendarAlt className="trend-icon" />
              Records across all sessions
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Academic Year</span>
              <span className="footer-value">
                {new Date().getFullYear()}-{new Date().getFullYear() + 1}
              </span>
            </div>
          </div>
        </div>

        {/* AVERAGE ATTENDANCE */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper attendance">
              <FaUserCheck className="stat-icon" />
            </div>
            <div className="stat-title">Average Attendance</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value attendance">{summary.averageAttendance?.toLocaleString() || "0"}</div>
            <div className={`stat-trend ${attendanceStatus}`}>
              <FaUserCheck className="trend-icon" />
              Estimated Rate: {attendanceRate.toFixed(1)}%
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Status</span>
              <span className={`footer-value ${attendanceStatus}`}>
                {attendanceStatus.charAt(0).toUpperCase() + attendanceStatus.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VISUAL SUMMARY SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaChartPie className="erp-card-icon" />
            Attendance Visualization
          </h3>
        </div>
        <div className="erp-card-body">
          <div className="visual-container">
            {/* CIRCULAR PROGRESS */}
            <div className="circular-progress">
              <div 
                className="progress-circle"
                style={{
                  background: `conic-gradient(#4CAF50 ${attendanceRate}%, #e0e0e0 ${attendanceRate}% 100%)`
                }}
              >
                <div className="progress-center">
                  <div className="progress-value">{attendanceRate.toFixed(0)}%</div>
                  <div className="progress-label">Attendance Rate</div>
                </div>
              </div>
              
              <div className="progress-legend">
                <div className="legend-item present">
                  <span className="legend-color present"></span>
                  <span>Present: {summary.averageAttendance?.toLocaleString() || "0"} students</span>
                </div>
                <div className="legend-item absent">
                  <span className="legend-color absent"></span>
                  <span>Absent: {(50 - summary.averageAttendance)?.toLocaleString() || "0"} students*</span>
                </div>
              </div>
              
              <div className="progress-note">
                <FaInfoCircle className="note-icon" />
                <span>*Based on estimated class size of 50 students</span>
              </div>
            </div>

            {/* METRICS GRID */}
            <div className="metrics-grid">
              <div className="metric-item">
                <div className="metric-icon present">
                  <FaUserCheck />
                </div>
                <div className="metric-content">
                  <div className="metric-label">Average Present</div>
                  <div className="metric-value">{summary.averageAttendance?.toLocaleString() || "0"}</div>
                  <div className="metric-description">Students per session</div>
                </div>
              </div>
              
              <div className="metric-item">
                <div className="metric-icon absent">
                  <FaUserTimes />
                </div>
                <div className="metric-content">
                  <div className="metric-label">Estimated Absent</div>
                  <div className="metric-value">{(50 - summary.averageAttendance)?.toLocaleString() || "0"}</div>
                  <div className="metric-description">Students per session</div>
                </div>
              </div>
              
              <div className="metric-item">
                <div className="metric-icon sessions">
                  <FaCalendarAlt />
                </div>
                <div className="metric-content">
                  <div className="metric-label">Total Sessions</div>
                  <div className="metric-value">{Math.round(summary.totalRecords / 50) || "0"}</div>
                  <div className="metric-description">Estimated sessions*</div>
                </div>
              </div>
              
              <div className="metric-item">
                <div className="metric-icon rate">
                  <FaPercentage />
                </div>
                <div className="metric-content">
                  <div className="metric-label">Attendance Target</div>
                  <div className="metric-value">85%</div>
                  <div className="metric-description">
                    {attendanceRate >= 85 ? (
                      <span className="target-met">✓ Target achieved</span>
                    ) : (
                      <span className="target-pending">
                        {Math.ceil(85 - attendanceRate)}% to target
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED ANALYSIS SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaGraduationCap className="erp-card-icon" />
            Attendance Analysis
          </h3>
        </div>
        <div className="erp-card-body">
          <div className="analysis-grid">
            <div className="analysis-card excellent">
              <div className="analysis-icon">
                <FaCheckCircle />
              </div>
              <div className="analysis-content">
                <div className="analysis-title">Excellent Attendance</div>
                <div className="analysis-value">≥ 85%</div>
                <div className="analysis-description">
                  Sessions with attendance rate at or above 85%
                </div>
              </div>
            </div>
            
            <div className="analysis-card good">
              <div className="analysis-icon">
                <FaCheckCircle />
              </div>
              <div className="analysis-content">
                <div className="analysis-title">Good Attendance</div>
                <div className="analysis-value">75% - 84%</div>
                <div className="analysis-description">
                  Sessions meeting minimum attendance requirements
                </div>
              </div>
            </div>
            
            <div className="analysis-card fair">
              <div className="analysis-icon">
                <FaClock />
              </div>
              <div className="analysis-content">
                <div className="analysis-title">Needs Attention</div>
                <div className="analysis-value">65% - 74%</div>
                <div className="analysis-description">
                  Sessions requiring follow-up and intervention
                </div>
              </div>
            </div>
            
            <div className="analysis-card poor">
              <div className="analysis-icon">
                <FaTimesCircle />
              </div>
              <div className="analysis-content">
                <div className="analysis-title">Critical Level</div>
                <div className="analysis-value">&lt; 65%</div>
                <div className="analysis-description">
                  Sessions requiring immediate administrative action
                </div>
              </div>
            </div>
          </div>
          
          <div className="analysis-footer">
            <div className="footer-note">
              <FaInfoCircle className="note-icon" />
              <span>* Attendance rate calculated based on estimated class size of 50 students per session</span>
            </div>
            <div className="footer-disclaimer">
              <span>Note: This is an aggregated summary. For detailed session-wise analysis, please refer to the Attendance Reports module.</span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="footer-note animate-fade-in">
        <FaInfoCircle className="note-icon" />
        <span>
          This report shows aggregated attendance summary for your college. Data is automatically updated with each attendance entry. 
          Last refreshed: {new Date().toLocaleString()}
        </span>
        <button 
          className="refresh-btn" 
          onClick={fetchAttendanceSummary}
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
        
        .stat-icon-wrapper.records { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .stat-icon-wrapper.attendance { background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%); }
        
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
        
        .stat-value.attendance { color: #4CAF50; }
        
        .stat-trend {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .stat-trend.excellent { color: #4CAF50; }
        .stat-trend.good { color: #8BC34A; }
        .stat-trend.fair { color: #FF9800; }
        .stat-trend.poor { color: #F44336; }
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
        
        .footer-value.excellent { color: #4CAF50; }
        .footer-value.good { color: #8BC34A; }
        .footer-value.fair { color: #FF9800; }
        .footer-value.poor { color: #F44336; }
        
        /* VISUAL SECTION */
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
          padding: 2rem;
        }
        
        .visual-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: center;
        }
        
        /* CIRCULAR PROGRESS */
        .circular-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }
        
        .progress-circle {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .progress-circle::before {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: white;
        }
        
        .progress-center {
          position: relative;
          z-index: 1;
          text-align: center;
        }
        
        .progress-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1a4b6d;
        }
        
        .progress-label {
          font-size: 1.1rem;
          color: #6c757d;
          margin-top: 0.25rem;
        }
        
        .progress-legend {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
        }
        
        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 4px;
        }
        
        .legend-color.present { background: #4CAF50; }
        .legend-color.absent { background: #F44336; }
        
        .progress-note {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #6c757d;
          margin-top: 0.5rem;
        }
        
        .note-icon {
          font-size: 1rem;
          color: #1a4b6d;
        }
        
        /* METRICS GRID */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
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
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        
        .metric-icon.present { background: rgba(76, 175, 80, 0.15); color: #4CAF50; }
        .metric-icon.absent { background: rgba(244, 67, 54, 0.15); color: #F44336; }
        .metric-icon.sessions { background: rgba(33, 150, 243, 0.15); color: #2196F3; }
        .metric-icon.rate { background: rgba(255, 152, 0, 0.15); color: #FF9800; }
        
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
        }
        
        .metric-description {
          font-size: 0.85rem;
          color: #6c757d;
          line-height: 1.4;
        }
        
        .target-met {
          color: #4CAF50;
          font-weight: 600;
        }
        
        .target-pending {
          color: #FF9800;
          font-weight: 600;
        }
        
        /* ANALYSIS SECTION */
        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .analysis-card {
          display: flex;
          align-items: flex-start;
          gap: 1.25rem;
          padding: 1.5rem;
          border-radius: 16px;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }
        
        .analysis-card.excellent {
          background: rgba(76, 175, 80, 0.08);
          border-left-color: #4CAF50;
        }
        
        .analysis-card.good {
          background: rgba(139, 195, 74, 0.08);
          border-left-color: #8BC34A;
        }
        
        .analysis-card.fair {
          background: rgba(255, 152, 0, 0.08);
          border-left-color: #FF9800;
        }
        
        .analysis-card.poor {
          background: rgba(244, 67, 54, 0.08);
          border-left-color: #F44336;
        }
        
        .analysis-card:hover {
          transform: translateX(5px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .analysis-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .analysis-card.excellent .analysis-icon { background: rgba(76, 175, 80, 0.15); color: #4CAF50; }
        .analysis-card.good .analysis-icon { background: rgba(139, 195, 74, 0.15); color: #8BC34A; }
        .analysis-card.fair .analysis-icon { background: rgba(255, 152, 0, 0.15); color: #FF9800; }
        .analysis-card.poor .analysis-icon { background: rgba(244, 67, 54, 0.15); color: #F44336; }
        
        .analysis-content {
          flex: 1;
        }
        
        .analysis-title {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 0.25rem;
          font-size: 1.05rem;
        }
        
        .analysis-value {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 0.25rem;
        }
        
        .analysis-card.excellent .analysis-value { color: #4CAF50; }
        .analysis-card.good .analysis-value { color: #8BC34A; }
        .analysis-card.fair .analysis-value { color: #FF9800; }
        .analysis-card.poor .analysis-value { color: #F44336; }
        
        .analysis-description {
          font-size: 0.9rem;
          color: #6c757d;
          line-height: 1.5;
        }
        
        .analysis-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 1px solid #f0f2f5;
          margin-top: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .footer-note {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #6c757d;
        }
        
        .footer-disclaimer {
          font-size: 0.85rem;
          color: #9e9e9e;
          font-style: italic;
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
        
        .skeleton-visual-section {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 1.5rem;
        }
        
        .skeleton-chart {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: #e9ecef;
          margin: 0 auto 1.5rem;
        }
        
        .skeleton-metrics {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        .skeleton-metric-item {
          height: 60px;
          background: #e9ecef;
          border-radius: 12px;
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
          .visual-container {
            grid-template-columns: 1fr;
            text-align: center;
          }
          
          .metrics-grid {
            grid-template-columns: 1fr;
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
          
          .visual-container {
            gap: 1rem;
          }
          
          .progress-circle {
            width: 160px;
            height: 160px;
          }
          
          .progress-value {
            font-size: 2rem;
          }
          
          .metrics-grid,
          .analysis-grid {
            grid-template-columns: 1fr;
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
          
          .progress-circle {
            width: 140px;
            height: 140px;
          }
          
          .progress-value {
            font-size: 1.75rem;
          }
          
          .progress-label {
            font-size: 1rem;
          }
          
          .metric-value {
            font-size: 1.25rem;
          }
          
          .analysis-value {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}