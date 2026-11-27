import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import PageHeader from "../../../components/PageHeader";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import {
  FaUsers,
  FaCheckCircle,
  FaHourglassHalf,
  FaChartPie,
  FaInfoCircle,
  FaGraduationCap,
  FaUniversity,
  FaCalendarAlt,
  FaDownload,
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaSyncAlt,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function SuperAdminReports() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const AUTH_ERROR_CODES = new Set([
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
    "TOKEN_BLACKLISTED",
    "TOKEN_INVALIDATED",
    "USER_NOT_FOUND",
    "ACCOUNT_DEACTIVATED",
    "UNAUTHORIZED",
  ]);

  /* ================= FETCH ADMISSION SUMMARY ================= */
  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const year = selectedYear;
      const res = await api.get("/reports/admissions/super-summary", {
        params: { month: selectedMonth, year },
      });
      setData(res.data);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load admission summary. Please try again.";

      logger.error("Error fetching admission summary:", statusCode, errorCode);

      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });

      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  /* ================= FETCH MONTHLY ADMISSIONS (TARGETED) ================= */
  const fetchMonthlyAdmissions = async (month, year) => {
    try {
      setMonthlyLoading(true);
      const res = await api.get("/reports/admissions/super-summary", {
        params: { month, year },
      });
      setData((prev) =>
        prev ? { ...prev, monthlyAdmissions: res.data.monthlyAdmissions, monthlyGrowth: res.data.monthlyGrowth } : prev
      );
    } catch (err) {
      logger.error("Error fetching monthly admissions:", err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    fetchSummary();
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
      <ApiError
        title="Reports Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchSummary}
        onGoBack={() => window.history.back()}
      />
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading || !data) {
    return (
      <div className="parent-portal-wrapper">
        <div
          className="parent-portal-container parent-loading-container"
          style={{ minHeight: "70vh" }}
        >
          <Loading
            size="md"
            color="primary"
            text="Loading admission reports..."
          />
        </div>
      </div>
    );
  }
  return (
    <div className="erp-container" style={{ paddingTop: "0.5rem" }}>
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/super-admin/dashboard" },
          { label: "Admission Reports" }
        ]}
      />

      {/* HEADER */}
      <PageHeader
        icon={FaChartPie}
        title="Admission Analytics Dashboard"
        subtitle="Real-time admission status and analytics across all colleges"
        actions={
          <button
            className="rpt-refresh-btn"
            onClick={fetchSummary}
            title="Refresh report data"
          >
            <FaSyncAlt className="rpt-btn-icon" />
            <span>Refresh</span>
          </button>
        }
      />

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
              <span className={`footer-value ${data.monthlyGrowth > 0 ? 'positive' : data.monthlyGrowth < 0 ? 'negative' : 'neutral'}`}>
                {data.monthlyGrowth > 0 ? <FaArrowUp /> : data.monthlyGrowth < 0 ? <FaArrowDown /> : null} {data.monthlyGrowth ? `${data.monthlyGrowth > 0 ? '+' : ''}${data.monthlyGrowth}%` : '0%'}
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
              {data.approvedPercentage ?? 0}% of total
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Approval Rate</span>
              <span className="footer-value positive">
                <FaCheckCircle /> {data.approvedPercentage ?? 0}%
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
                <FaClock /> {data.avgProcessingTime ? `${data.avgProcessingTime} days` : 'N/A'}
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
              {data.rejectedPercentage ?? 0}% of total
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Rejection Rate</span>
              <span className="footer-value negative">
                <FaExclamationTriangle /> {data.rejectedPercentage ?? 0}%
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
              <div className="footer-value-group positive">
                <FaCheckCircle className="footer-icon" />
                <span className="footer-value">{data.activeColleges || 0}</span>
              </div>
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
            <div className="stat-value">
              {monthlyLoading ? (
                <span className="monthly-loading">Updating…</span>
              ) : (
                data.monthlyAdmissions?.toLocaleString() || 0
              )}
            </div>
            <div className={`stat-trend ${data.monthlyGrowth > 0 ? 'positive' : data.monthlyGrowth < 0 ? 'negative' : 'neutral'}`}>
              {data.monthlyGrowth > 0 ? <FaArrowUp className="trend-icon" /> : data.monthlyGrowth < 0 ? <FaArrowDown className="trend-icon" /> : null}
              {data.monthlyGrowth ? `${data.monthlyGrowth > 0 ? '+' : ''}${data.monthlyGrowth}%` : '+0%'} vs last month
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item monthly-footer">
              <span className="footer-label">Current Month</span>
              <div className="footer-selectors">
                <FaCalendarAlt className="footer-icon" />
                <select
                  className="month-selector"
                  value={selectedMonth}
                  onChange={(e) => {
                    const month = Number(e.target.value);
                    setSelectedMonth(month);
                    fetchMonthlyAdmissions(month, selectedYear);
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(2025, i).toLocaleString("default", {
                        month: "short",
                      })}
                    </option>
                  ))}
                </select>
                <select
                  className="month-selector"
                  value={selectedYear}
                  onChange={(e) => {
                    const year = Number(e.target.value);
                    setSelectedYear(year);
                    fetchMonthlyAdmissions(selectedMonth, year);
                  }}
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <option key={i} value={new Date().getFullYear() - 2 + i}>
                      {new Date().getFullYear() - 2 + i}
                    </option>
                  ))}
                </select>
              </div>
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
                  {data.approvedPercentage ?? 0}%
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
                  {data.pendingPercentage ?? 0}%
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
                  {data.rejectedPercentage ?? 0}%
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
      <style>{`
        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
          animation: fadeIn 0.6s ease;
        }
        
        /* ================= PAGE HEADER REFRESH BUTTON ================= */
        .rpt-refresh-btn {
          min-height: 48px;
          padding: 0 20px;
          border: none;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }

        .rpt-refresh-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }

        .rpt-btn-icon {
          font-size: 14px;
          flex-shrink: 0;
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
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        
        .stat-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.4s ease forwards;
          min-height: 160px;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }
        
        .stat-card:nth-child(1) { animation-delay: 0.05s; }
        .stat-card:nth-child(2) { animation-delay: 0.1s; }
        .stat-card:nth-child(3) { animation-delay: 0.15s; }
        .stat-card:nth-child(4) { animation-delay: 0.2s; }
        .stat-card:nth-child(5) { animation-delay: 0.25s; }
        .stat-card:nth-child(6) { animation-delay: 0.3s; }
        
        .stat-card-header {
          padding: 0.7rem 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          border-bottom: 1px solid #f0f2f5;
        }
        
        .stat-icon-wrapper {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1.15rem;
        }
        
        .stat-icon-wrapper.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .stat-icon-wrapper.approved { background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%); }
        .stat-icon-wrapper.pending { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); }
        .stat-icon-wrapper.rejected { background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%); }
        .stat-icon-wrapper.colleges { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); }
        .stat-icon-wrapper.admissions { background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); }
        
        .stat-icon {
          color: white;
          font-size: 1.1rem;
        }
        
        .stat-title {
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.88rem;
          line-height: 1.25;
        }
        
        .stat-card-body {
          padding: 0.65rem 0.9rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 0;
        }
        
        .stat-value {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1a4b6d;
          line-height: 1.1;
          margin-bottom: 0.3rem;
        }
        
        .stat-value.approved { color: #4CAF50; }
        .stat-value.pending { color: #FF9800; }
        .stat-value.rejected { color: #F44336; }
        
        .stat-trend {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.78rem;
          font-weight: 500;
        }
        
        .stat-trend.positive { color: #4CAF50; }
        .stat-trend.warning { color: #FF9800; }
        .stat-trend.negative { color: #F44336; }
        .stat-trend.neutral { color: #6c757d; }
        
        .trend-icon {
          font-size: 0.8rem;
        }
        
        .stat-card-footer {
          padding: 0.55rem 1rem;
          background: #fafbfc;
          border-top: 1px solid #f0f2f5;
          font-size: 0.78rem;
        }
        
        .stat-footer-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          min-height: 28px;
        }
        
        .footer-label {
          color: #6c757d;
          font-weight: 500;
          white-space: nowrap;
        }
        
        .footer-value {
          font-weight: 600;
          color: #1a4b6d;
        }
        
        .footer-value.positive { color: #4CAF50; }
        .footer-value.warning { color: #FF9800; }
        .footer-value.negative { color: #F44336; }
        
        .footer-icon {
          font-size: 0.85rem;
          flex-shrink: 0;
        }
        
        .footer-value-group {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        
        .footer-value-group.positive .footer-icon { color: #4CAF50; }
        .footer-value-group.warning .footer-icon { color: #FF9800; }
        .footer-value-group.negative .footer-icon { color: #F44336; }
        
        .monthly-footer {
          width: 100%;
        }
        
        .footer-selectors {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        
        .footer-selectors .footer-icon {
          color: #1a4b6d;
        }
        
        .month-selector {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 5px;
          padding: 0.15rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #1a4b6d;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          appearance: auto;
          min-width: 80px;
        }
        
        .month-selector:hover {
          border-color: #1a4b6d;
        }
        
        .month-selector:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 2px rgba(26, 75, 109, 0.15);
        }
        
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
        
        .monthly-loading {
          font-size: 1rem;
          color: #999;
          font-weight: 400;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }
        
/* =========================================================
   RESPONSIVE DESIGN
   Desktop layout remains unchanged
   Tablet + Mobile only
   ========================================================= */

/* =========================
   TABLET
   769px - 991px
   ========================= */
@media (min-width: 769px) and (max-width: 991.98px) {

  .erp-container {
    padding: 1.25rem;
    width: 100%;
    box-sizing: border-box;
  }

  /* Info banner */
  .info-banner {
    padding: 1rem 1.25rem;
    margin-bottom: 1.25rem;
    gap: 0.9rem;
  }

  .info-content {
    font-size: 0.92rem;
    line-height: 1.5;
  }

  /* Stats - 2 columns */
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.875rem;
    margin-bottom: 1.25rem;
  }

  .stat-card {
    min-width: 0;
  }

  .stat-card-header {
    padding: 0.85rem 1rem;
    gap: 0.7rem;
  }

  .stat-icon-wrapper {
    width: 40px;
    height: 40px;
    min-width: 40px;
    font-size: 1.15rem;
  }

  .stat-title {
    font-size: 0.88rem;
    line-height: 1.25;
  }

  .stat-card-body {
    padding: 0.7rem 1rem;
  }

  .stat-value {
    font-size: 1.85rem;
  }

  .stat-trend {
    font-size: 0.78rem;
    line-height: 1.3;
  }

  .stat-card-footer {
    padding: 0.5rem 0.9rem;
  }

  .stat-footer-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    flex-wrap: wrap;
    min-height: 26px;
  }

  .footer-label {
    font-size: 0.72rem;
  }

  .footer-value {
    font-size: 0.74rem;
  }

  .footer-icon {
    font-size: 0.8rem;
  }

  .footer-value-group {
    gap: 0.3rem;
  }

  .monthly-footer {
    width: 100%;
  }

  .footer-selectors {
    gap: 0.35rem;
  }

  .month-selector {
    font-size: 0.7rem;
    padding: 0.125rem 0.4rem;
    min-width: 70px;
  }

  /* Detailed metrics */
  .erp-card {
    margin-bottom: 1.25rem;
  }

  .erp-card-header {
    padding: 1.2rem 1.4rem;
  }

  .erp-card-header h3 {
    font-size: 1.25rem;
  }

  .erp-card-body {
    padding: 1.25rem;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .metric-item {
    padding: 1rem;
    gap: 0.8rem;
  }

  .metric-description {
    font-size: 0.82rem;
  }

  /* Footer note */
  .footer-note {
    padding: 0.9rem 1.1rem;
    gap: 0.75rem;
  }
}


/* =========================
   MOBILE
   0px - 768px
   ========================= */
@media (max-width: 768px) {

  .erp-container {
    padding: 0.75rem;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  /* INFO BANNER */
  .info-banner {
    padding: 1rem;
    margin-bottom: 1rem;

    display: flex;
    flex-direction: column;
    align-items: center;

    text-align: center;
    gap: 0.65rem;

    border-radius: 12px;
  }

  .info-icon {
    width: 38px;
    height: 38px;
    min-width: 38px;
    font-size: 0.9rem;
  }

  .info-content {
    width: 100%;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  /* =========================
STATS
      ========================= */

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .stat-card {
    width: 100%;
    min-width: 0;
    border-radius: 12px;
  }

  .stat-card-header {
    padding: 0.8rem 0.9rem;
    gap: 0.65rem;
  }

  .stat-icon-wrapper {
    width: 40px;
    height: 40px;
    min-width: 40px;
    border-radius: 10px;
    font-size: 1.1rem;
  }

  .stat-title {
    font-size: 0.9rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .stat-card-body {
    padding: 0.7rem 0.9rem;
  }

  .stat-value {
    font-size: 1.75rem;
    line-height: 1.1;
    margin-bottom: 0.35rem;
  }

  .stat-trend {
    font-size: 0.78rem;
    line-height: 1.3;
    flex-wrap: wrap;
  }

  .trend-icon {
    font-size: 0.8rem;
  }

  .stat-card-footer {
    padding: 0.55rem 0.9rem;
  }

  .stat-footer-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
    min-height: 26px;
  }

  .footer-label {
    font-size: 0.72rem;
  }

  .footer-value {
    font-size: 0.74rem;
  }

  .footer-icon {
    font-size: 0.78rem;
  }

  .footer-value-group {
    gap: 0.3rem;
  }

  .monthly-footer {
    width: 100%;
  }

  .footer-selectors {
    gap: 0.35rem;
    justify-content: flex-end;
    width: 100%;
    margin-top: 0.25rem;
  }

  .month-selector {
    font-size: 0.7rem;
    padding: 0.15rem 0.35rem;
    min-width: 70px;
  }

  /* =========================
     DETAILED METRICS
     ========================= */

  .erp-card {
    border-radius: 14px;
    margin-bottom: 1rem;
  }

  .erp-card-header {
    padding: 1rem 1.1rem;
  }

  .erp-card-header h3 {
    font-size: 1.15rem;
    line-height: 1.3;
  }

  .erp-card-icon {
    font-size: 1.05rem;
  }

  .erp-card-body {
    padding: 1rem;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .metric-item {
    padding: 0.9rem;
    gap: 0.75rem;
    border-radius: 10px;
  }

  .metric-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    font-size: 1.1rem;
  }

  .metric-label {
    font-size: 0.82rem;
  }

  .metric-value {
    font-size: 1.25rem;
  }

  .metric-description {
    font-size: 0.78rem;
    line-height: 1.35;
  }

  /* =========================
     FOOTER NOTE
     ========================= */

  .footer-note {
    padding: 0.9rem 1rem;
    margin-top: 0.75rem;

    display: flex;
    flex-direction: column;
    align-items: center;

    text-align: center;
    gap: 0.65rem;

    font-size: 0.8rem;
    line-height: 1.45;
  }

  .note-icon {
    font-size: 1.05rem;
  }

  .refresh-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
  }

  /* Loading */
  .erp-loading-container {
    padding: 1rem;
    gap: 1.25rem;
  }

  .erp-loading-text {
    font-size: 1.1rem;
    text-align: center;
  }

  .loading-progress {
    width: 200px;
  }

  .skeleton-container {
    padding: 0.75rem;
  }

  .skeleton-stats-grid {
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }

  .skeleton-stat-card {
    padding: 1rem;
  }
}


/* =========================
   SMALL MOBILE
   0px - 480px
   ========================= */
@media (max-width: 480px) {

  .erp-container {
    padding: 0.6rem;
  }

  /* Info */
  .info-banner {
    padding: 0.85rem;
    gap: 0.55rem;
  }

  .info-icon {
    width: 34px;
    height: 34px;
    min-width: 34px;
  }

  .info-content {
    font-size: 0.82rem;
    line-height: 1.45;
  }

  /* Stats */
  .stats-grid {
    gap: 0.6rem;
  }

  .stat-card {
    border-radius: 10px;
  }

  .stat-card-header {
    padding: 0.65rem 0.75rem;
  }

  .stat-icon-wrapper {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border-radius: 8px;
    font-size: 1rem;
  }

  .stat-title {
    font-size: 0.82rem;
  }

  .stat-card-body {
    padding: 0.6rem 0.75rem;
  }

  .stat-value {
    font-size: 1.55rem;
  }

  .stat-trend {
    font-size: 0.72rem;
  }

  .stat-card-footer {
    padding: 0.5rem 0.75rem;
  }

  .stat-footer-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.45rem;
    flex-wrap: wrap;
    min-height: 24px;
  }

  .footer-label,
  .footer-value {
    font-size: 0.68rem;
  }

  .footer-icon {
    font-size: 0.75rem;
  }

  .footer-value-group {
    gap: 0.25rem;
  }

  .monthly-footer {
    width: 100%;
  }

  .footer-selectors {
    gap: 0.3rem;
    justify-content: flex-end;
    width: 100%;
    margin-top: 0.2rem;
  }

  .month-selector {
    padding: 0.1rem 0.25rem;
    font-size: 0.68rem;
    min-width: 65px;
  }

  /* Detailed metrics */
  .erp-card-header {
    padding: 0.9rem;
  }

  .erp-card-header h3 {
    font-size: 1.05rem;
  }

  .erp-card-body {
    padding: 0.85rem;
  }

  .metric-item {
    padding: 0.8rem;
  }

  .metric-icon {
    width: 38px;
    height: 38px;
    min-width: 38px;
  }

  .metric-value {
    font-size: 1.15rem;
  }

  .metric-description {
    font-size: 0.75rem;
  }

  /* Footer */
  .footer-note {
    padding: 0.8rem;
    font-size: 0.76rem;
  }
}
      `}</style>
    </div>
  );
}