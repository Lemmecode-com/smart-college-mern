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
            <div className="stat-support neutral">
              <FaGraduationCap className="support-icon" />
              Across all colleges
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
            <div className="stat-support positive">
              <FaCheckCircle className="support-icon" />
              {data.approvedPercentage ?? 0}% of total
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
            <div className="stat-support warning">
              <FaHourglassHalf className="support-icon" />
              Requires admin attention
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
            <div className="stat-support negative">
              <FaExclamationTriangle className="support-icon" />
              {data.rejectedPercentage ?? 0}% of total
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
            <div className="stat-support neutral">
              <FaUniversity className="support-icon" />
              {data.activeColleges || 0} active
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
            <div className={`stat-support ${data.monthlyGrowth > 0 ? 'positive' : data.monthlyGrowth < 0 ? 'negative' : 'neutral'}`}>
              {data.monthlyGrowth > 0 ? <FaArrowUp className="support-icon" /> : data.monthlyGrowth < 0 ? <FaArrowDown className="support-icon" /> : null}
              {data.monthlyGrowth ? `${data.monthlyGrowth > 0 ? '+' : ''}${data.monthlyGrowth}%` : '+0%'} vs last month
            </div>
          </div>
          <div className="stat-card-footer monthly-selectors-inline">
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

      {/* DETAILED ADMISSION METRICS */}
      <div className="detailed-metrics-panel animate-fade-in">
        <div className="detailed-metrics-header">
          <FaChartPie className="detailed-metrics-icon" aria-hidden="true" />
          <h3 className="detailed-metrics-title">Detailed Admission Metrics</h3>
        </div>
        <div className="detailed-metrics-grid">
          {/* APPROVAL RATE */}
          <div className="detailed-metric-col">
            <div className="detailed-metric-label">Approval Rate</div>
            <div className="detailed-metric-value-row">
              <span className="detailed-metric-value approved" aria-live="polite">
                {data.approvedPercentage ?? 0}%
              </span>
            </div>
            <div className="detailed-metric-bar-wrapper">
              <div
                className="detailed-metric-bar approved"
                role="progressbar"
                aria-valuenow={Math.min(100, Math.max(0, data.approvedPercentage ?? 0))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Approval rate ${data.approvedPercentage ?? 0} percent`}
                style={{ width: `${Math.min(100, Math.max(0, data.approvedPercentage ?? 0))}%` }}
              ></div>
            </div>
            <div className="detailed-metric-desc">Percentage of approved applications</div>
          </div>

          {/* PENDING RATE */}
          <div className="detailed-metric-col">
            <div className="detailed-metric-label">Pending Rate</div>
            <div className="detailed-metric-value-row">
              <span className="detailed-metric-value pending" aria-live="polite">
                {data.pendingPercentage ?? 0}%
              </span>
            </div>
            <div className="detailed-metric-bar-wrapper">
              <div
                className="detailed-metric-bar pending"
                role="progressbar"
                aria-valuenow={Math.min(100, Math.max(0, data.pendingPercentage ?? 0))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Pending rate ${data.pendingPercentage ?? 0} percent`}
                style={{ width: `${Math.min(100, Math.max(0, data.pendingPercentage ?? 0))}%` }}
              ></div>
            </div>
            <div className="detailed-metric-desc">Applications awaiting review</div>
          </div>

          {/* REJECTION RATE */}
          <div className="detailed-metric-col">
            <div className="detailed-metric-label">Rejection Rate</div>
            <div className="detailed-metric-value-row">
              <span className="detailed-metric-value rejected" aria-live="polite">
                {data.rejectedPercentage ?? 0}%
              </span>
            </div>
            <div className="detailed-metric-bar-wrapper">
              <div
                className="detailed-metric-bar rejected"
                role="progressbar"
                aria-valuenow={Math.min(100, Math.max(0, data.rejectedPercentage ?? 0))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Rejection rate ${data.rejectedPercentage ?? 0} percent`}
                style={{ width: `${Math.min(100, Math.max(0, data.rejectedPercentage ?? 0))}%` }}
              ></div>
            </div>
            <div className="detailed-metric-desc">Applications not approved</div>
          </div>

          {/* COLLEGES COVERAGE */}
          <div className="detailed-metric-col">
            <div className="detailed-metric-label">Colleges Coverage</div>
            <div className="detailed-metric-value-row">
              <span className="detailed-metric-value colleges" aria-live="polite">
                {data.activeColleges || 0} / {data.totalColleges || 0}
              </span>
            </div>
            <div className="detailed-metric-bar-wrapper">
              <div
                className="detailed-metric-bar colleges"
                role="progressbar"
                aria-valuenow={data.totalColleges > 0 ? Math.min(100, Math.max(0, Math.round((data.activeColleges || 0) / data.totalColleges * 100))) : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`College coverage ${data.totalColleges > 0 ? Math.round((data.activeColleges || 0) / data.totalColleges * 100) : 0} percent`}
                style={{ width: `${data.totalColleges > 0 ? Math.min(100, Math.max(0, Math.round((data.activeColleges || 0) / data.totalColleges * 100))) : 0}%` }}
              ></div>
            </div>
            <div className="detailed-metric-desc">Active colleges out of total registered</div>
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
          padding: 0 12px 1.5rem;
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
          width: 38px;
          height: 38px;
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
          font-size: 0.85rem;
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
          grid-auto-rows: 1fr;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        
        .stat-card {
          background: white;
          border: 1px solid #dce6ef;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(14, 55, 70, 0.05);
          transition: border-color 200ms ease, box-shadow 200ms ease;
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.4s ease forwards;
          height: 100%;
          min-width: 0;
        }
        
        .stat-card:hover {
          border-color: #b9d1df;
          box-shadow: 0 4px 10px rgba(14, 55, 70, 0.08);
        }
        
        .stat-card:nth-child(1) { animation-delay: 0.05s; }
        .stat-card:nth-child(2) { animation-delay: 0.1s; }
        .stat-card:nth-child(3) { animation-delay: 0.15s; }
        .stat-card:nth-child(4) { animation-delay: 0.2s; }
        .stat-card:nth-child(5) { animation-delay: 0.25s; }
        .stat-card:nth-child(6) { animation-delay: 0.3s; }
        
        .stat-card-header {
          padding: 10px 12px 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .stat-icon-wrapper {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 0.8rem;
        }
        
        .stat-icon-wrapper.total { background: #eaf3f7; color: #164e63; }
        .stat-icon-wrapper.approved { background: #ecfdf3; color: #15803d; }
        .stat-icon-wrapper.pending { background: #fff7ed; color: #b45309; }
        .stat-icon-wrapper.rejected { background: #fef2f2; color: #b91c1c; }
        .stat-icon-wrapper.colleges { background: #ecfeff; color: #0e7490; }
        .stat-icon-wrapper.admissions { background: #eaf8fc; color: #0e7490; }
        
        .stat-icon {
          color: currentColor;
          font-size: 1.2rem;
        }
        
        .stat-title {
          font-weight: 600;
          color: #334155;
          font-size: 1.2rem;
          line-height: 1.2;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        
        .stat-card-body {
          padding: 0 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #0e3746;
          line-height: 1.1;
          margin: 0;
          overflow-wrap: anywhere;
          margin-bottom: 10px;
        }
        
        .stat-value.approved { color: #15803d; }
        .stat-value.pending { color: #b45309; }
        .stat-value.rejected { color: #b91c1c; }
        
        .stat-support {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1.3;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        
        .stat-support.positive { color: #15803d; }
        .stat-support.warning { color: #b45309; }
        .stat-support.negative { color: #b91c1c; }
        .stat-support.neutral { color: #64748b; }
        
        .support-icon {
          font-size: 0.7rem;
        }
        
        .monthly-loading {
          font-size: 1rem;
          color: #999;
          font-weight: 400;
        }
        
        .stat-card-footer {
          padding: 0 12px 10px;
          border-top: 0;
          background: transparent;
          margin-top: 4px;
        }
        
        .monthly-selectors-inline {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: nowrap;
          width: 100%;
          min-width: 0;
        }
        
        .monthly-selectors-inline .footer-icon {
          color: #64748b;
          font-size: 0.7rem;
          flex: 0 0 auto;
        }
        
        .month-selector {
          background: #fff;
          border: 1px solid #dce6ef;
          border-radius: 6px;
          padding: 0.15rem 1rem 0.15rem 0.4rem;
          font-size: 0.7rem;
          font-weight: 500;
          color: #164e63;
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.5rem center;
          background-size: 12px;
          min-width: 0;
          width: 0;
          flex: 1 1 0;
          height: 26px;
        }
        
        .month-selector:hover {
          border-color: #9db9c9;
          background-color: #f8fbfd;
        }
        
        .month-selector:focus {
          border-color: #22b8e6;
          box-shadow: 0 0 0 2px rgba(34, 184, 230, 0.18);
          background-color: #fff;
        }
        
        .month-selector:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        /* DETAILED METRICS */
        .detailed-metrics-panel {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.03);
          border: 1px solid #e9ecef;
          padding: 1rem 1.25rem;
          margin-bottom: 1rem;
          animation: fadeIn 0.6s ease;
        }
        
        .detailed-metrics-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #f0f2f5;
        }
        
        .detailed-metrics-icon {
          color: #1a4b6d;
          font-size: 1.1rem;
          opacity: 0.7;
        }
        
        .detailed-metrics-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 600;
          color: #1a4b6d;
        }
        
        .detailed-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        
        .detailed-metric-col {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        
        .detailed-metric-label {
          font-size: 0.7rem;
          color: #6c757d;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .detailed-metric-value-row {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        
        .detailed-metric-value {
          font-size: 1.4rem;
          font-weight: 700;
          line-height: 1.2;
        }
        
        .detailed-metric-value.approved { color: #4CAF50; }
        .detailed-metric-value.pending { color: #FF9800; }
        .detailed-metric-value.rejected { color: #F44336; }
        .detailed-metric-value.colleges { color: #2196F3; }
        
        .detailed-metric-bar-wrapper {
          height: 7px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          flex-shrink: 0;
        }
        
        .detailed-metric-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          width: 0;
        }
        
        .detailed-metric-bar.approved { background: #4CAF50; }
        .detailed-metric-bar.pending { background: #FF9800; }
        .detailed-metric-bar.rejected { background: #F44336; }
        .detailed-metric-bar.colleges { background: #2196F3; }
        
        .detailed-metric-desc {
          font-size: 0.7rem;
          color: #6c757d;
          line-height: 1.3;
        }
        
        /* FOOTER NOTE */
        .footer-note {
          background: #e8f5e9;
          border-radius: 10px;
          padding: 0.625rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-top: 0.75rem;
          border-left: 3px solid #4CAF50;
          font-size: 0.82rem;
          color: #1b5e20;
        }
        
        .note-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        
        .refresh-btn {
          background: rgba(76, 175, 80, 0.12);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4CAF50;
          cursor: pointer;
          transition: background-color 0.15s ease;
          flex-shrink: 0;
        }
        
        .refresh-btn:hover {
          background: rgba(76, 175, 80, 0.2);
        }
        
        .refresh-icon {
          font-size: 1rem;
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
    padding: 1.25rem 12px;
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
    grid-auto-rows: 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .stat-card {
    min-width: 0;
    height: 100%;
  }

  .stat-card-header {
    padding: 10px 12px 6px;
    gap: 6px;
  }

  .stat-icon-wrapper {
    width: 26px;
    height: 26px;
    min-width: 26px;
    border-radius: 8px;
    font-size: 0.95rem;
  }

  .stat-title {
    font-size: 0.78rem;
    line-height: 1.2;
  }

  .stat-card-body {
    padding: 0 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .stat-support {
    font-size: 0.65rem;
  }

  .support-icon {
    font-size: 0.65rem;
  }

  .stat-card-footer {
    padding: 0 12px 10px;
  }

  .monthly-selectors-inline {
    gap: 6px;
  }

  .monthly-selectors-inline .footer-icon {
    font-size: 0.7rem;
  }

  .month-selector {
    font-size: 0.7rem;
    padding: 0.15rem 1rem 0.15rem 0.4rem;
    min-width: 0;
    width: 0;
    flex: 1 1 0;
    height: 26px;
    background-size: 10px;
    background-position: right 0.4rem center;
  }

  /* Detailed metrics */
  .detailed-metrics-panel {
    padding: 0.875rem 1rem;
    border-radius: 10px;
  }
  
  .detailed-metrics-header {
    margin-bottom: 0.875rem;
    padding-bottom: 0.625rem;
  }
  
  .detailed-metrics-icon {
    font-size: 1rem;
  }
  
  .detailed-metrics-title {
    font-size: 0.95rem;
  }
  
  .detailed-metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  
  .detailed-metric-col {
    gap: 0.3rem;
  }
  
  .detailed-metric-label {
    font-size: 0.65rem;
  }
  
  .detailed-metric-value {
    font-size: 1.25rem;
  }
  
  .detailed-metric-bar-wrapper {
    height: 6px;
  }
  
  .detailed-metric-desc {
    font-size: 0.65rem;
  }

  /* Footer note */
  .footer-note {
    padding: 0.75rem 1rem;
    gap: 0.625rem;
    border-radius: 8px;
    border-left-width: 3px;
  }
}


/* =========================
   MOBILE
   0px - 768px
   ========================= */
@media (max-width: 768px) {

  .erp-container {
    padding: 0.75rem 8px;
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
    grid-auto-rows: 1fr;
    gap: 0.625rem;
    margin-bottom: 0.875rem;
  }

  .stat-card {
    width: 100%;
    min-width: 0;
    border-radius: 12px;
    height: 100%;
    min-height: 0;
  }

  .stat-card-header {
    padding: 10px 12px 6px;
    gap: 6px;
  }

  .stat-icon-wrapper {
    width: 26px;
    height: 26px;
    min-width: 26px;
    border-radius: 8px;
    font-size: 0.95rem;
  }

  .stat-title {
    font-size: 0.78rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .stat-card-body {
    padding: 0 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-value {
    font-size: 1.5rem;
    line-height: 1.1;
  }

  .stat-support {
    font-size: 0.65rem;
  }

  .support-icon {
    font-size: 0.65rem;
  }

  .stat-card-footer {
    padding: 0 12px 10px;
  }

  .monthly-selectors-inline {
    gap: 6px;
    justify-content: flex-start;
  }

  .monthly-selectors-inline .footer-icon {
    font-size: 0.7rem;
  }

  .monthly-selectors-inline .month-selector {
    font-size: 0.7rem;
    padding: 0.15rem 1rem 0.15rem 0.4rem;
    min-width: 0;
    width: 0;
    flex: 1 1 0;
    height: 26px;
    background-size: 10px;
    background-position: right 0.4rem center;
  }

  /* =========================
     DETAILED METRICS
     ========================= */

  .detailed-metrics-panel {
    padding: 0.875rem 1rem;
    border-radius: 10px;
  }
  
  .detailed-metrics-header {
    margin-bottom: 0.875rem;
    padding-bottom: 0.625rem;
  }
  
  .detailed-metrics-icon {
    font-size: 1rem;
  }
  
  .detailed-metrics-title {
    font-size: 0.95rem;
  }
  
  .detailed-metrics-grid {
    grid-template-columns: 1fr;
    gap: 0.625rem;
  }
  
  .detailed-metric-col {
    gap: 0.3rem;
  }
  
  .detailed-metric-label {
    font-size: 0.65rem;
  }
  
  .detailed-metric-value {
    font-size: 1.2rem;
  }
  
  .detailed-metric-bar-wrapper {
    height: 6px;
  }
  
  .detailed-metric-desc {
    font-size: 0.65rem;
  }

  /* =========================
     FOOTER NOTE
     ========================= */

  .footer-note {
    padding: 0.75rem 1rem;
    margin-top: 0.625rem;
    border-radius: 8px;
    border-left-width: 3px;

    display: flex;
    flex-direction: column;
    align-items: center;

    text-align: center;
    gap: 0.55rem;

    font-size: 0.75rem;
    line-height: 1.4;
  }

  .note-icon {
    font-size: 1rem;
  }

  .refresh-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
    border-radius: 6px;
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
    padding: 0.6rem 8px;
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
    grid-auto-rows: 1fr;
  }

  .stat-card {
    border-radius: 12px;
  }

  .stat-card-header {
    padding: 10px 12px 6px;
    gap: 6px;
  }

  .stat-icon-wrapper {
    width: 26px;
    height: 26px;
    min-width: 26px;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  .stat-title {
    font-size: 0.75rem;
  }

  .stat-card-body {
    padding: 0 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-value {
    font-size: 1.35rem;
  }

  .stat-support {
    font-size: 0.65rem;
  }

  .support-icon {
    font-size: 0.62rem;
  }

  .stat-card-footer {
    padding: 0 12px 10px;
  }

  .monthly-selectors-inline {
    gap: 6px;
    justify-content: flex-start;
  }

  .monthly-selectors-inline .footer-icon {
    font-size: 0.7rem;
  }

  .monthly-selectors-inline .month-selector {
    font-size: 0.65rem;
    padding: 0.15rem 1rem 0.15rem 0.35rem;
    min-width: 0;
    width: 0;
    flex: 1 1 0;
    height: 26px;
    background-size: 9px;
    background-position: right 0.35rem center;
  }

  /* Detailed metrics */
  .detailed-metrics-panel {
    padding: 0.75rem;
    border-radius: 8px;
  }
  
  .detailed-metrics-header {
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
  }
  
  .detailed-metrics-icon {
    font-size: 0.95rem;
  }
  
  .detailed-metrics-title {
    font-size: 0.9rem;
  }
  
  .detailed-metrics-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .detailed-metric-col {
    gap: 0.25rem;
  }
  
  .detailed-metric-label {
    font-size: 0.62rem;
  }
  
  .detailed-metric-value {
    font-size: 1.1rem;
  }
  
  .detailed-metric-bar-wrapper {
    height: 5px;
  }
  
  .detailed-metric-desc {
    font-size: 0.62rem;
  }

  .metric-value {
    font-size: 1.1rem;
  }

  .metric-description {
    font-size: 0.7rem;
  }

  /* Footer */
  .footer-note {
    padding: 0.625rem 0.875rem;
    border-radius: 7px;
    border-left-width: 2px;
    font-size: 0.72rem;
    line-height: 1.35;
  }
}
      `}</style>
    </div>
  );
}