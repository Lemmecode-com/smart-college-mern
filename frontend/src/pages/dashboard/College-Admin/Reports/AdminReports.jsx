import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import ExportButtons from "../../../../components/ExportButtons";
import Breadcrumb from "../../../../components/Breadcrumb";
import {
  FaUsers,
  FaCheckCircle,
  FaHourglassHalf,
  FaChartPie,
  FaSyncAlt,
  FaExclamationTriangle,
  FaInfoCircle,
  FaGraduationCap,
  FaArrowLeft,
  FaUniversity,
} from "react-icons/fa";

/* ================= CONSTANTS & CONFIGURATION ================= */
const CONFIG = {
  MAX_RETRY: 3,
  TOAST: {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "colored",
  },
  THEME: {
    PRIMARY: "#0f3a4a",
    PRIMARY_DARK: "#0c2d3a",
    PRIMARY_LIGHT: "#1a4b6d",
    ACCENT: "#3db5e6",
    SUCCESS: "#28a745",
    WARNING: "#ffc107",
    DANGER: "#dc3545",
    INFO: "#17a2b8",
  },
};

/* ================= MODULE-LEVEL FLAG (Persists across re-renders) ================= */
let hasFetchedData = false;

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const hasLoadedRef = useRef(false);

  /* ================= FETCH ADMISSION SUMMARY ================= */
  const fetchSummary = useCallback(async () => {
    // Prevent duplicate fetches - check both module flag and ref
    if (hasFetchedData || hasLoadedRef.current) {
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/reports/admissions/college-admin-summary");
      setData(res.data);
      setRetryCount(0);
      
      // Show success toast with unique ID to prevent duplicates
      toast.success("Admission reports loaded successfully!", {
        ...CONFIG.TOAST,
        toastId: "admin-reports-success",
      });
      
      // Set both flags to prevent any duplicate calls
      hasFetchedData = true;
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("Reports fetch error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load admission summary. Please try again.",
      );
      // Show error toast with unique ID to prevent duplicates
      toast.error("Failed to load admission reports.", {
        ...CONFIG.TOAST,
        toastId: "admin-reports-error",
      });
      hasFetchedData = true;
      hasLoadedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    // Cleanup function to reset flags on unmount - fixes blank page on second navigation
    return () => {
      hasFetchedData = false;
      hasLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = useCallback(() => {
    if (retryCount < CONFIG.MAX_RETRY) {
      setRetryCount((prev) => prev + 1);
      // Reset both flags to allow retry
      hasFetchedData = false;
      hasLoadedRef.current = false;
      fetchSummary();
    } else {
      toast.error("Maximum retry attempts reached.", {
        ...CONFIG.TOAST,
        toastId: "admin-reports-max-retry",
      });
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  }, [retryCount, fetchSummary]);

  /* ================= EXPORT DATA PREPARATION ================= */
  const getExportData = () => {
    if (!data) return [];
    return [
      { metric: "Total Students", value: data.total || 0 },
      { metric: "Approved Students", value: data.approved || 0 },
      { metric: "Pending Approvals", value: data.pending || 0 },
      { metric: "Rejected", value: data.rejected || 0 },
      {
        metric: "Approval Rate",
        value: data.approved && data.total
          ? `${Math.round((data.approved / data.total) * 100)}%`
          : "0%",
      },
      {
        metric: "Pending Rate",
        value: data.pending && data.total
          ? `${Math.round((data.pending / data.total) * 100)}%`
          : "0%",
      },
    ];
  };

  /* ================= LEGACY EXPORT HANDLER (Keep for backward compatibility) ================= */
  const exportCSV = () => {
    if (!data) return;

    const headers = ["Metric", "Count"];
    const rows = [
      ["Total Students", data.total || 0],
      ["Approved Students", data.approved || 0],
      ["Pending Approvals", data.pending || 0],
      [
        "Approval Rate",
        data.approved && data.total
          ? `${Math.round((data.approved / data.total) * 100)}%`
          : "0%",
      ],
      [
        "Pending Rate",
        data.pending && data.total
          ? `${Math.round((data.pending / data.total) * 100)}%`
          : "0%",
      ],
    ];

    let csvContent =
      "text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `college_admission_summary_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ================= CALCULATED METRICS (MEMOIZED) ================= */
  const approvalRate = useMemo(() => 
    data?.approved && data?.total
      ? Math.round((data.approved / data.total) * 100)
      : 0,
    [data?.approved, data?.total]
  );

  const pendingRate = useMemo(() =>
    data?.pending && data?.total
      ? Math.round((data.pending / data.total) * 100)
      : 0,
    [data?.pending, data?.total]
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
            disabled={retryCount >= CONFIG.MAX_RETRY}
          >
            <FaSyncAlt className="erp-btn-icon spin" />
            {retryCount >= CONFIG.MAX_RETRY ? "Max Retries" : `Retry (${retryCount}/${CONFIG.MAX_RETRY})`}
          </button>
        </div>
      </div>
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <Loading
        size="lg"
        color="primary"
        text="Loading admission reports..."
        fullScreen={true}
      />
    );
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Admission Reports" }
        ]}
      />

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="header-icon-wrapper">
            <FaChartPie />
          </div>
          <div className="header-text">
            <h1 className="dashboard-title">College Admission Analytics</h1>
            <p className="dashboard-subtitle">
              Real-time admission status and analytics for your institution
            </p>
          </div>
        </div>
        <div className="header-actions">
          <div className="export-actions-group">
            <ExportButtons
              title="College Admission Analytics Report"
              columns={[
                { header: 'Metric', key: 'metric' },
                { header: 'Value', key: 'value' }
              ]}
              data={getExportData()}
              filename="admission_report"
              showPDF={true}
              showExcel={true}
            />
          </div>
          <button
            className="btn-refresh"
            onClick={fetchSummary}
            title="Refresh report data"
            aria-label="Refresh admission reports"
          >
            <FaSyncAlt className="spin-icon" />
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
          <strong>College Admission Overview:</strong> This report provides
          real-time analytics of student admissions for your college. Data is
          updated automatically with each refresh.
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
            <div className="stat-value">
              {data.total?.toLocaleString() || 0}
            </div>
            <div className="stat-trend neutral">
              <FaGraduationCap className="trend-icon" />
              Registered students
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
            <div className="stat-value approved">
              {data.approved?.toLocaleString() || 0}
            </div>
            <div className="stat-trend positive">
              <FaCheckCircle className="trend-icon" />
              Approval Rate: {approvalRate}%
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
            <div className="stat-value pending">
              {data.pending?.toLocaleString() || 0}
            </div>
            <div className="stat-trend warning">
              <FaHourglassHalf className="trend-icon" />
              Pending Rate: {pendingRate}%
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED METRICS SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaChartPie className="erp-card-icon" />
            Admission Metrics Breakdown
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
                <div className="metric-value">{approvalRate}%</div>
                <div className="metric-description">
                  {data.approved || 0} out of {data.total || 0}{" "}
                  applications approved
                </div>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-icon pending">
                <FaHourglassHalf />
              </div>
              <div className="metric-content">
                <div className="metric-label">Pending Rate</div>
                <div className="metric-value">{pendingRate}%</div>
                <div className="metric-description">
                  {data.pending || 0} applications awaiting review
                </div>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-icon total">
                <FaUsers />
              </div>
              <div className="metric-content">
                <div className="metric-label">Total Applications</div>
                <div className="metric-value">
                  {data.total?.toLocaleString() || 0}
                </div>
                <div className="metric-description">
                  All student applications received this academic year
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VISUAL SUMMARY SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaGraduationCap className="erp-card-icon" />
            Admission Status Overview
          </h3>
        </div>
        <div className="erp-card-body">
          <div className="status-overview">
            <div className="status-item approved">
              <div className="status-icon">
                <FaCheckCircle />
              </div>
              <div className="status-content">
                <div className="status-count">{data.approved || 0}</div>
                <div className="status-label">Approved</div>
              </div>
              <div
                className="status-bar"
                style={{ width: `${approvalRate}%` }}
              ></div>
            </div>

            <div className="status-item pending">
              <div className="status-icon">
                <FaHourglassHalf />
              </div>
              <div className="status-content">
                <div className="status-count">{data.pending || 0}</div>
                <div className="status-label">Pending</div>
              </div>
              <div
                className="status-bar"
                style={{ width: `${pendingRate}%` }}
              ></div>
            </div>

            <div className="status-item total">
              <div className="status-icon">
                <FaUsers />
              </div>
              <div className="status-content">
                <div className="status-count">{data.total || 0}</div>
                <div className="status-label">Total Students</div>
              </div>
              <div className="status-bar total-bar"></div>
            </div>
          </div>

          <div className="overview-footer">
            <div className="overview-note">
              <FaInfoCircle className="note-icon" />
              <span>Visual representation of current admission status</span>
            </div>
            <div className="overview-legend">
              <span className="legend-item approved">
                <span className="legend-color approved"></span>
                Approved
              </span>
              <span className="legend-item pending">
                <span className="legend-color pending"></span>
                Pending
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="footer-note animate-fade-in">
        <FaInfoCircle className="note-icon" />
        <span>
          This report shows real-time admission status for your college. Data is
          automatically updated. Last refreshed: {new Date().toLocaleString()}
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
        /* ================= DESIGN SYSTEM - SIDEBAR THEME MATCH ================= */
        :root {
          --primary-dark: #0c2d3a;
          --primary: #0f3a4a;
          --primary-light: #1a4b6d;
          --accent: #3db5e6;
          --accent-light: #4fc3f7;
          --success: #28a745;
          --warning: #ffc107;
          --danger: #dc3545;
          --info: #17a2b8;
          --text-primary: #212529;
          --text-secondary: #6c757d;
          --bg-light: #f8f9fa;
          --border-light: #e9ecef;
          --shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
          --shadow-md: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
          --shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175);
          --radius-sm: 0.375rem;
          --radius-md: 0.5rem;
          --radius-lg: 0.75rem;
          /* Sidebar Font Theme */
          --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          --font-size-xs: 0.75rem;
          --font-size-sm: 0.875rem;
          --font-size-base: 1rem;
          --font-size-lg: 1.125rem;
          --font-size-xl: 1.25rem;
          --font-size-2xl: 1.5rem;
          --font-weight-normal: 400;
          --font-weight-medium: 500;
          --font-weight-semibold: 600;
          --font-weight-bold: 700;
          --line-height-base: 1.5;
        }

        /* ================= CONTAINER ================= */
        .erp-container {
          padding: 1.5rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          min-height: 100vh;
          font-family: var(--font-family-base);
          font-size: var(--font-size-base);
          line-height: var(--line-height-base);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          animation: fadeIn 0.6s ease;
        }

        /* ================= HEADER - ENTERPRISE LAYOUT ================= */
        .erp-page-header {
          background: var(--primary);
          padding: 1.75rem;
          border-radius: var(--radius-lg);
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(15, 58, 74, 0.3);
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

        .header-icon-wrapper {
          width: 64px;
          height: 64px;
          background: rgba(61, 181, 230, 0.2);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: var(--accent-light);
        }

        .dashboard-title {
          margin: 0;
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
          color: white;
          font-family: var(--font-family-base);
        }

        .dashboard-subtitle {
          margin: 0.375rem 0 0;
          color: rgba(255, 255, 255, 0.9);
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-medium);
          font-family: var(--font-family-base);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .export-actions-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* ================= EXPORT BUTTONS - ENHANCED UI ================= */
        .export-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn-export {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1.125rem;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: var(--font-weight-semibold);
          font-size: var(--font-size-sm);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(255, 255, 255, 0.15);
          color: white;
          backdrop-filter: blur(10px);
          min-width: 100px;
          position: relative;
          overflow: hidden;
          font-family: var(--font-family-base);
        }

        .btn-export::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: left 0.5s;
        }

        .btn-export:hover::before {
          left: 100%;
        }

        .btn-export:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .btn-export-pdf:hover:not(:disabled) {
          background: rgba(220, 53, 69, 0.9);
          border-color: rgba(255, 255, 255, 0.8);
          box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
        }

        .btn-export-excel:hover:not(:disabled) {
          background: rgba(40, 167, 69, 0.9);
          border-color: rgba(255, 255, 255, 0.8);
          box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
        }

        .btn-export:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-export.exporting {
          background: rgba(255, 255, 255, 0.3);
        }

        .btn-export svg {
          font-size: 1rem;
          flex-shrink: 0;
        }

        .btn-export span {
          white-space: nowrap;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        .btn-refresh {
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-lg);
          font-weight: var(--font-weight-semibold);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.15);
          color: white;
          transition: all var(--transition-base);
          font-size: var(--font-size-sm);
          font-family: var(--font-family-base);
        }

        .btn-refresh:hover {
          background: rgba(61, 181, 230, 0.25);
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(61, 181, 230, 0.3);
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
          border-left: 4px solid #4caf50;
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
          color: #4caf50;
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

        .stat-card:nth-child(1) {
          animation-delay: 0.1s;
        }
        .stat-card:nth-child(2) {
          animation-delay: 0.2s;
        }
        .stat-card:nth-child(3) {
          animation-delay: 0.3s;
        }

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

        .stat-icon-wrapper.total {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .stat-icon-wrapper.approved {
          background: linear-gradient(135deg, #4caf50 0%, #43a047 100%);
        }
        .stat-icon-wrapper.pending {
          background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
        }

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

        .stat-value.approved {
          color: #4caf50;
        }
        .stat-value.pending {
          color: #ff9800;
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .stat-trend.positive {
          color: #4caf50;
        }
        .stat-trend.warning {
          color: #ff9800;
        }
        .stat-trend.neutral {
          color: #6c757d;
        }

        .trend-icon {
          font-size: 0.95rem;
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

        .metric-icon.approved {
          background: rgba(76, 175, 80, 0.15);
          color: #4caf50;
        }
        .metric-icon.pending {
          background: rgba(255, 152, 0, 0.15);
          color: #ff9800;
        }
        .metric-icon.total {
          background: rgba(102, 126, 234, 0.15);
          color: #667eea;
        }

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

        /* STATUS OVERVIEW */
        .status-overview {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 12px;
          background: #f8f9fa;
          position: relative;
          overflow: hidden;
        }

        .status-item::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--status-color);
        }

        .status-item.approved::before {
          --status-color: #4caf50;
        }
        .status-item.pending::before {
          --status-color: #ff9800;
        }
        .status-item.total::before {
          --status-color: #667eea;
        }

        .status-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .status-item.approved .status-icon {
          background: rgba(76, 175, 80, 0.15);
          color: #4caf50;
        }
        .status-item.pending .status-icon {
          background: rgba(255, 152, 0, 0.15);
          color: #ff9800;
        }
        .status-item.total .status-icon {
          background: rgba(102, 126, 234, 0.15);
          color: #667eea;
        }

        .status-content {
          flex: 1;
        }

        .status-count {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a4b6d;
        }

        .status-label {
          font-size: 0.9rem;
          color: #6c757d;
          font-weight: 500;
        }

        .status-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 4px;
          background: var(--bar-color);
          border-radius: 0 4px 4px 0;
          transition: width 0.5s ease;
        }

        .status-item.approved .status-bar {
          --bar-color: #4caf50;
        }
        .status-item.pending .status-bar {
          --bar-color: #ff9800;
        }
        .status-item.total .status-bar {
          --bar-color: #667eea;
          width: 100% !important;
        }

        .total-bar {
          width: 100% !important;
        }

        .overview-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid #f0f2f5;
          margin-top: 1rem;
        }

        .overview-note {
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

        .overview-legend {
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

        .legend-color.approved {
          background: #4caf50;
        }
        .legend-color.pending {
          background: #ff9800;
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
          border-left: 4px solid #2196f3;
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
          color: #2196f3;
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
          color: #f44336;
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
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        @keyframes blink-pulse {
          0%,
          100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(26, 75, 109, 0.5);
          }
          50% {
            opacity: 0.7;
            box-shadow: 0 0 15px 5px rgba(26, 75, 109, 0.7);
          }
        }

        @keyframes progressPulse {
          0%,
          100% {
            width: 35%;
          }
          50% {
            width: 65%;
          }
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

          .header-actions {
            flex-direction: column;
            width: 100%;
            align-items: flex-start;
            gap: 1rem;
          }

          .export-actions-group {
            width: 100%;
            justify-content: flex-start;
          }

          .export-buttons {
            flex-wrap: wrap;
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

          .overview-footer {
            flex-direction: column;
            align-items: flex-start;
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

          .header-actions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }

          .export-actions-group {
            width: 100%;
            justify-content: center;
          }

          .export-buttons {
            justify-content: center;
            gap: 0.5rem;
          }

          .btn-export {
            min-width: 90px;
            padding: 0.5rem 1rem;
            font-size: var(--font-size-xs);
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

          .status-overview {
            gap: 0.75rem;
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

          .status-count {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
