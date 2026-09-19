import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useContext } from "react";
import { showSuccess, showError } from "../../../../utils/toast";
import { toast } from "react-toastify";
import ApiError from "../../../../components/ApiError";
import { logger } from "../../../../utils/logger";

const PAGE_LOAD_TOAST_ID = "college-payment-reports-load";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import ExportButtons from "../../../../components/ExportButtons";
import Breadcrumb from "../../../../components/Breadcrumb";
import { AuthContext } from "../../../../auth/AuthContext";
import {
  FaMoneyBillWave,
  FaChartPie,
  FaSyncAlt,
  FaSpinner,
  FaInfoCircle,
  FaDownload,
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle,
  FaArrowUp,
  FaArrowDown,
  FaPercentage,
  FaFileInvoice,
  FaWallet,
  FaFilter,
  FaChartLine,
} from "react-icons/fa";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Authentication / session error codes that must NOT surface a toast.
// These are routed exclusively to ApiError for a friendly mapped screen.
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

export default function PaymentReports() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const hasLoadedRef = useRef(false);
  const fetchIdRef = useRef(0);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // all, thisMonth, lastMonth, thisYear, custom
  const [dateError, setDateError] = useState("");
  const [shouldFetchSummary, setShouldFetchSummary] = useState(true);

   // Trend analysis state
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [trendData, setTrendData] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const trendFetchIdRef = useRef(0);

  // Memoize year options to prevent unnecessary re-renders
  const yearOptions = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const year = new Date().getFullYear() - i;
      return { value: year, label: year };
    });
  }, []);

  /* ================= FETCH PAYMENT SUMMARY ================= */
  const fetchPaymentSummary = useCallback(async () => {
    hasLoadedRef.current = false;
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;

    try {
      setLoading(true);
      setError(null);

      if (currentFetchId !== fetchIdRef.current) return;

      // Build query parameters based on date filter
      let queryParams = {};
      let validationError = null;

      if (dateFilter !== "all") {
        const now = new Date();
        let start, end;

        switch (dateFilter) {
          case "thisMonth":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
          case "lastMonth":
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
          case "thisYear":
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
            break;
          case "custom":
            if (startDate) start = new Date(startDate);
            if (endDate) end = new Date(endDate);

            if (startDate && endDate && start > end) {
              validationError = "Start date must be before end date";
            }
            break;
          default:
            break;
        }

        if (validationError) {
          setDateError(validationError);
          setLoading(false);
          return;
        }

        if (start) queryParams.startDate = start.toISOString().split('T')[0];
        if (end) queryParams.endDate = end.toISOString().split('T')[0];
      }

      setDateError("");

      const queryString = new URLSearchParams(queryParams).toString();
      const url = `/reports/payments/filtered${queryString ? `?${queryString}` : ''}`;

      const res = await api.get(url);

      if (currentFetchId !== fetchIdRef.current) return;

      setData(res.data || {});
      setRetryCount(0);

      if (currentFetchId !== fetchIdRef.current) return;

      toast.success("Payment summary loaded successfully!", {
        toastId: PAGE_LOAD_TOAST_ID,
        autoClose: 3000,
      });
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      logger.error("Payment summary fetch error:", statusCode, errorCode);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to load payment summary. Please try again.";
      setError({ message: errorMessage, statusCode, errorCode });

      if (currentFetchId !== fetchIdRef.current) return;

      const isAuthError =
        statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));
      if (!isAuthError) {
        showError("Failed to load payment summary.");
      }
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [dateFilter, startDate, endDate]);

   const fetchTrendData = useCallback(async (year) => {
     trendFetchIdRef.current += 1;
     const currentFetchId = trendFetchIdRef.current;

     try {
       setTrendLoading(true);
       const res = await api.get(`/reports/payments/trends?year=${year}`);
       if (currentFetchId !== trendFetchIdRef.current) return;
       setTrendData(res.data || null);
     } catch (err) {
       console.error("Payment trends fetch error:", err);
       if (currentFetchId !== trendFetchIdRef.current) return;
       setTrendData(null);
     } finally {
       if (currentFetchId === trendFetchIdRef.current) {
         setTrendLoading(false);
       }
     }
   }, []);

   useEffect(() => {
     fetchTrendData(selectedYear);
   }, [selectedYear, fetchTrendData]);

    useEffect(() => {
    if (shouldFetchSummary) {
      fetchPaymentSummary();
      setShouldFetchSummary(false);
    }
    // Cleanup function to reset flag on unmount - fixes blank page on second navigation
    return () => {
      hasLoadedRef.current = false;
      toast.dismiss(PAGE_LOAD_TOAST_ID);
    };
  }, [shouldFetchSummary, fetchPaymentSummary]);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount((prev) => prev + 1);
      // Reset flag to allow retry
      hasLoadedRef.current = false;
      fetchPaymentSummary();
    } else {
      showError("Maximum retry attempts reached.");
      setError({ message: "Maximum retry attempts reached. Please check your connection." });
    }
  }, [retryCount, fetchPaymentSummary]);

  /* ================= EXPORT DATA PREPARATION ================= */
  const formatCurrency = (amount) => {
    // Use "Rs." prefix instead of ₹ symbol for better PDF compatibility
    const formatted = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `Rs. ${formatted}`;
  };

  const getExportData = () => {
    if (!data) return [];
    return [
      { metric: "Total Expected Fee", value: data.totalExpectedFee || 0 },
      { metric: "Total Collected", value: data.totalCollected || 0 },
      { metric: "Total Pending", value: data.totalPending || 0 },
      { metric: "Collection Rate", value: parseFloat(collectionRate.toFixed(1)) },
      { metric: "Pending Rate", value: parseFloat(pendingRate.toFixed(1)) },
    ];
  };

  /* ================= CALCULATED METRICS ================= */
  const collectionRate = useMemo(() => {
    if (!data || !data.totalExpectedFee || data.totalExpectedFee === 0)
      return 0;
    return ((data.totalCollected || 0) / data.totalExpectedFee) * 100;
  }, [data]);

  const pendingRate = useMemo(() => {
    if (!data || !data.totalExpectedFee || data.totalExpectedFee === 0)
      return 0;
    return ((data.totalPending || 0) / data.totalExpectedFee) * 100;
  }, [data]);

  const collectionStatus = useMemo(() => {
    if (collectionRate >= 90) return "excellent";
    if (collectionRate >= 75) return "good";
    if (collectionRate >= 60) return "fair";
    return "poor";
  }, [collectionRate]);

  /* ================= EXPORT HANDLER ================= */
  const exportCSV = () => {
    if (!data) return;

    const headers = ["Metric", "Amount (₹)"];
    const rows = [
      ["Total Expected Fee", data.totalExpectedFee?.toLocaleString() || "0"],
      ["Total Collected", data.totalCollected?.toLocaleString() || "0"],
      ["Total Pending", data.totalPending?.toLocaleString() || "0"],
      ["Collection Rate", `${collectionRate.toFixed(1)}%`],
      ["Pending Rate", `${pendingRate.toFixed(1)}%`],
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
      `payment_summary_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <ApiError
        title="Payment Reports Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={handleRetry}
        onGoBack={() => window.history.back()}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={loading}
      />
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading || !data) {
    return (
      <Loading
        size="lg"
        color="primary"
        text="Loading payment summary reports..."
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
          ...(user?.role === "COLLEGE_ADMIN" || user?.role === "PRINCIPAL"
            ? [{ label: "Reports", path: "/college-admin/reports-dashboard" }]
            : []
          ),
          { label: "Payment Summary" },
        ]}
      />

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon blink-pulse">
            <FaMoneyBillWave />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Payment Summary Report</h1>
            <p className="erp-page-subtitle">
              Comprehensive overview of fee collection status across all
              students
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <div className="export-actions-group">
            <ExportButtons
              title="Payment Summary Report"
              columns={[
                { header: "Metric", key: "metric" },
                { header: "Value", key: "value" },
              ]}
              data={getExportData()}
              filename="payment_summary_report"
              showPDF={true}
              showExcel={true}
            />
          </div>
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => setShouldFetchSummary(true)}
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
          <FaWallet className="pulse" />
        </div>
        <div className="info-content">
          <strong>Financial Overview:</strong> This report provides a real-time
          summary of fee collection status for all students. Data is updated
          automatically with each transaction.
        </div>
      </div>

      {/* DATE FILTER CONTROLS */}
      <div className="erp-card animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <div className="erp-card-header">
          <h3>
            <FaFilter className="erp-card-icon" />
            Filter by Date Range
          </h3>
        </div>
        <div className="erp-card-body">
          <div className="filter-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="filter-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#1a4b6d' }}>
                Quick Filters:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className={`btn ${dateFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                  onClick={() => { setDateFilter('all'); setDateError(""); setShouldFetchSummary(true); }}
                >
                  All Time
                </button>
                <button
                  className={`btn ${dateFilter === 'thisMonth' ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                  onClick={() => { setDateFilter('thisMonth'); setDateError(""); setShouldFetchSummary(true); }}
                >
                  This Month
                </button>
                <button
                  className={`btn ${dateFilter === 'lastMonth' ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                  onClick={() => { setDateFilter('lastMonth'); setDateError(""); setShouldFetchSummary(true); }}
                >
                  Last Month
                </button>
                <button
                  className={`btn ${dateFilter === 'thisYear' ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                  onClick={() => { setDateFilter('thisYear'); setDateError(""); setShouldFetchSummary(true); }}
                >
                  This Year
                </button>
                <button
                  className={`btn ${dateFilter === 'custom' ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                  onClick={() => { setDateFilter('custom'); setDateError(""); setShouldFetchSummary(true); }}
                >
                  Custom Range
                </button>
              </div>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div
                  className="date-inputs"
                  style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '600' }}>
                    Start Date:
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{
                      width: '140px',
                      pointerEvents: 'auto',
                      zIndex: 10
                    }}
                    value={startDate}
                     onChange={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
                       setStartDate(e.target.value);
                       if (endDate && new Date(e.target.value) <= new Date(endDate)) {
                         setDateError("");
                       }
                     }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                    }}
                    onBlur={(e) => {
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '600' }}>
                    End Date:
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{
                      width: '140px',
                      pointerEvents: 'auto',
                      zIndex: 10
                    }}
                    value={endDate}
                     onChange={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
                       setEndDate(e.target.value);
                       if (startDate && new Date(startDate) <= new Date(e.target.value)) {
                         setDateError("");
                       }
                     }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                    }}
                    onBlur={(e) => {
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  />
                </div>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => setShouldFetchSummary(true)}
                    style={{ alignSelf: 'flex-end' }}
                  >
                    <FaSyncAlt /> Apply Filter
                  </button>
                </div>
                {dateError && (
                  <div style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: '500' }}>
                    {dateError}
                  </div>
                )}
              </>
            )}

            {dateFilter !== 'custom' && dateFilter !== 'all' && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => setShouldFetchSummary(true)}
                style={{ alignSelf: 'flex-end' }}
              >
                <FaSyncAlt /> Apply Filter
              </button>
            )}
          </div>

          {data?.dateRange && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <small style={{ color: '#6c757d' }}>
                <strong>Current Filter:</strong> {data.dateRange.startDate || 'Start'} to {data.dateRange.endDate || 'End'}
              </small>
            </div>
          )}
        </div>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid animate-fade-in">
        {/* TOTAL EXPECTED FEE */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper expected">
              <FaFileInvoice className="stat-icon" />
            </div>
            <div className="stat-title">Total Expected Fee</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">
              ₹{data.totalExpectedFee?.toLocaleString() || "0"}
            </div>
            <div className="stat-trend neutral">
              <FaFileInvoice className="trend-icon" />
              Total fee amount expected from all students
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

        {/* TOTAL COLLECTED */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper collected">
              <FaCheckCircle className="stat-icon" />
            </div>
            <div className="stat-title">Total Collected</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value collected">
              ₹{data.totalCollected?.toLocaleString() || "0"}
            </div>
            <div className="stat-trend positive">
              <FaCheckCircle className="trend-icon" />
              Collection Rate: {collectionRate.toFixed(1)}%
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Status</span>
              <span className={`footer-value ${collectionStatus}`}>
                {collectionStatus.charAt(0).toUpperCase() +
                  collectionStatus.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* TOTAL PENDING */}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper pending">
              <FaHourglassHalf className="stat-icon" />
            </div>
            <div className="stat-title">Total Pending</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value pending">
              ₹{data.totalPending?.toLocaleString() || "0"}
            </div>
            <div className="stat-trend warning">
              <FaHourglassHalf className="trend-icon" />
              Pending Rate: {pendingRate.toFixed(1)}%
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Action Required</span>
              <span className="footer-value warning">
                <FaHourglassHalf /> Follow up needed
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
            Fee Collection Visualization
          </h3>
        </div>
        <div className="erp-card-body">
          <div className="visual-container">
            {/* CIRCULAR PROGRESS */}
            <div className="circular-progress">
              <div
                className="progress-circle"
                style={{
                  background: `conic-gradient(#4CAF50 ${collectionRate}%, #e0e0e0 ${collectionRate}% 100%)`,
                }}
              >
                <div className="progress-center">
                  <div className="progress-value">
                    {collectionRate.toFixed(0)}%
                  </div>
                  <div className="progress-label">Collected</div>
                </div>
              </div>

              <div className="progress-legend">
                <div className="legend-item collected">
                  <span className="legend-color collected"></span>
                  <span>
                    Collected: ₹{data.totalCollected?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="legend-item pending">
                  <span className="legend-color pending"></span>
                  <span>
                    Pending: ₹{data.totalPending?.toLocaleString() || "0"}
                  </span>
                </div>
              </div>
            </div>

            {/* HORIZONTAL BAR */}
            <div className="horizontal-bar-container">
              <div className="bar-labels">
                <span className="bar-title">Fee Collection Status</span>
                <span className="bar-total">
                  Total: ₹{data.totalExpectedFee?.toLocaleString() || "0"}
                </span>
              </div>

              <div className="horizontal-bar">
                <div
                  className="bar-collected"
                  style={{ width: `${collectionRate}%` }}
                ></div>
                <div
                  className="bar-pending"
                  style={{ width: `${pendingRate}%` }}
                ></div>
              </div>

              <div className="bar-metrics">
                <div className="metric-item">
                  <FaCheckCircle className="metric-icon collected" />
                  <div>
                    <div className="metric-value">
                      ₹{data.totalCollected?.toLocaleString() || "0"}
                    </div>
                    <div className="metric-label">Collected</div>
                  </div>
                </div>
                <div className="metric-item">
                  <FaHourglassHalf className="metric-icon pending" />
                  <div>
                    <div className="metric-value">
                      ₹{data.totalPending?.toLocaleString() || "0"}
                    </div>
                    <div className="metric-label">Pending</div>
                  </div>
                </div>
                <div className="metric-item">
                  <FaPercentage className="metric-icon rate" />
                  <div>
                    <div className="metric-value">
                      {collectionRate.toFixed(1)}%
                    </div>
                    <div className="metric-label">Collection Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED METRICS SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaWallet className="erp-card-icon" />
            Financial Metrics Breakdown
          </h3>
        </div>
        <div className="erp-card-body">
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon-wrapper collected">
                <FaCheckCircle className="metric-icon-large" />
              </div>
              <div className="metric-content">
                <div className="metric-title">Collection Performance</div>
                <div className="metric-value-large">
                  {collectionRate.toFixed(1)}%
                </div>
                <div className="metric-description">
                  {collectionRate >= 90
                    ? "Excellent collection rate"
                    : collectionRate >= 75
                      ? "Good collection rate"
                      : collectionRate >= 60
                        ? "Fair collection rate - needs attention"
                        : "Poor collection rate - immediate action required"}
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrapper pending">
                <FaHourglassHalf className="metric-icon-large" />
              </div>
              <div className="metric-content">
                <div className="metric-title">Pending Amount</div>
                <div className="metric-value-large">
                  ₹{data.totalPending?.toLocaleString() || "0"}
                </div>
                <div className="metric-description">
                  Requires follow-up with {Math.round(data.totalPending / 5000)}{" "}
                  students*
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrapper expected">
                <FaFileInvoice className="metric-icon-large" />
              </div>
              <div className="metric-content">
                <div className="metric-title">Expected Revenue</div>
                <div className="metric-value-large">
                  ₹{data.totalExpectedFee?.toLocaleString() || "0"}
                </div>
                <div className="metric-description">
                  Total fee amount for current academic year
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrapper rate">
                <FaPercentage className="metric-icon-large" />
              </div>
              <div className="metric-content">
                <div className="metric-title">Collection Target</div>
                <div className="metric-value-large">{collectionRate.toFixed(0)}%</div>
                <div className="metric-description">
                  {collectionRate >= 90 ? (
                    <span className="target-met">✓ Target achieved</span>
                  ) : (
                    <span className="target-pending">
                      {Math.ceil(90 - collectionRate)}% to target
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="metrics-footer">
            <div className="footer-note">
              <FaInfoCircle className="note-icon" />
              <span>
                * Estimated based on average pending amount per student
              </span>
            </div>
            <div className="footer-disclaimer">
              <span>
                Note: All amounts are in Indian Rupees (₹). Data updated in
                real-time.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="footer-note animate-fade-in">
        <FaInfoCircle className="note-icon" />
        <span>
          This report shows real-time payment summary for your college. Data is
          automatically updated with each transaction. Last refreshed:{" "}
          {new Date().toLocaleString()}
        </span>
        <button
          className="refresh-btn"
          onClick={fetchPaymentSummary}
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
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(255, 255, 255, 0.15);
          color: white;
          backdrop-filter: blur(10px);
          min-width: 100px;
          position: relative;
          overflow: hidden;
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
        
        .stat-icon-wrapper.expected { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .stat-icon-wrapper.collected { background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%); }
        .stat-icon-wrapper.pending { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); }
        
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
        
        .stat-value.collected { color: #4CAF50; }
        .stat-value.pending { color: #FF9800; }
        
        .stat-trend {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .stat-trend.positive { color: #4CAF50; }
        .stat-trend.warning { color: #FF9800; }
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
        .footer-value.warning { color: #FF9800; }
        
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
        
        .legend-color.collected { background: #4CAF50; }
        .legend-color.pending { background: #FF9800; }
        
        /* HORIZONTAL BAR */
        .horizontal-bar-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .bar-labels {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .bar-title {
          font-weight: 700;
          color: #2c3e50;
          font-size: 1.1rem;
        }
        
        .bar-total {
          color: #1a4b6d;
          font-weight: 600;
          font-size: 1.05rem;
        }
        
        .horizontal-bar {
          height: 40px;
          background: #f0f2f5;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          position: relative;
        }
        
        .bar-collected {
          height: 100%;
          background: linear-gradient(90deg, #4CAF50 0%, #43A047 100%);
          border-radius: 20px 0 0 20px;
          transition: width 1s ease;
        }
        
        .bar-pending {
          height: 100%;
          background: linear-gradient(90deg, #FF9800 0%, #F57C00 100%);
          border-radius: 0 20px 20px 0;
          transition: width 1s ease;
        }
        
        .bar-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        
        .metric-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .metric-item:hover {
          background: #f0f5ff;
          transform: translateY(-2px);
        }
        
        .metric-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        
        .metric-icon.collected { background: rgba(76, 175, 80, 0.15); color: #4CAF50; }
        .metric-icon.pending { background: rgba(255, 152, 0, 0.15); color: #FF9800; }
        .metric-icon.rate { background: rgba(33, 150, 243, 0.15); color: #2196F3; }
        
        .metric-value {
          font-weight: 700;
          color: #1a4b6d;
        }
        
        .metric-label {
          font-size: 0.85rem;
          color: #6c757d;
          margin-top: 0.25rem;
        }
        
        /* DETAILED METRICS */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .metric-card {
          display: flex;
          align-items: flex-start;
          gap: 1.25rem;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 16px;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }
        
        .metric-card:hover {
          background: #f0f5ff;
          transform: translateX(5px);
          border-left: 4px solid #1a4b6d;
        }
        
        .metric-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1.75rem;
        }
        
        .metric-icon-wrapper.collected { background: rgba(76, 175, 80, 0.15); }
        .metric-icon-wrapper.pending { background: rgba(255, 152, 0, 0.15); }
        .metric-icon-wrapper.expected { background: rgba(102, 126, 234, 0.15); }
        .metric-icon-wrapper.rate { background: rgba(33, 150, 243, 0.15); }
        
        .metric-icon-large {
          font-size: 1.5rem;
        }
        
        .metric-icon-large.collected { color: #4CAF50; }
        .metric-icon-large.pending { color: #FF9800; }
        .metric-icon-large.expected { color: #667eea; }
        .metric-icon-large.rate { color: #2196F3; }
        
        .metric-content {
          flex: 1;
        }
        
        .metric-title {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }
        
        .metric-value-large {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1a4b6d;
          margin-bottom: 0.5rem;
        }
        
        .metric-description {
          font-size: 0.9rem;
          color: #6c757d;
          line-height: 1.5;
        }
        
        .target-met {
          color: #4CAF50;
          font-weight: 600;
        }
        
        .target-pending {
          color: #FF9800;
          font-weight: 600;
        }
        
        .metrics-footer {
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
        
        .note-icon {
          font-size: 1rem;
          color: #1a4b6d;
        }
        
        .footer-disclaimer {
          font-size: 0.85rem;
          color: #9e9e9e;
          font-style: italic;
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
        
/* =========================================================
   RESPONSIVE DESIGN
   Desktop styles remain unchanged
   ========================================================= */


/* =========================================================
   TABLET
   769px - 1024px
   ========================================================= */

@media (min-width: 769px) and (max-width: 1024px) {

  /* ================= CONTAINER ================= */

  .erp-container {
    padding: 1.15rem;
  }


  /* ================= PAGE HEADER ================= */

  .erp-page-header {
    padding: 1.35rem;
    margin-bottom: 1.25rem;

    flex-direction: column;
    align-items: stretch;

    gap: 1.15rem;

    border-radius: 15px;
  }

  .erp-header-content {
    width: 100%;

    display: flex;
    align-items: center;

    gap: 1rem;
  }

  .erp-header-icon {
    width: 54px;
    height: 54px;

    min-width: 54px;

    font-size: 1.55rem;
    border-radius: 12px;
  }

  .erp-header-text {
    min-width: 0;
    flex: 1;
  }

  .erp-page-title {
    font-size: 1.6rem;
    line-height: 1.2;

    margin: 0;
  }

  .erp-page-subtitle {
    font-size: 0.9rem;
    line-height: 1.45;

    margin-top: 0.35rem;
  }


  /* ================= HEADER ACTIONS ================= */

  .erp-header-actions {
    width: 100%;

    display: flex;
    flex-direction: row;

    align-items: center;
    justify-content: space-between;

    gap: 0.75rem;
  }

  .export-actions-group {
    width: auto;

    display: flex;
    align-items: center;
  }

  .export-buttons {
    display: flex;
    flex-direction: row;

    gap: 0.5rem;
    flex-wrap: nowrap;
  }

  .btn-export {
    min-width: 95px;

    padding: 0.6rem 0.85rem;

    font-size: 0.8rem;
  }

  .erp-header-actions .erp-btn {
    width: auto;

    min-width: 110px;

    padding: 0.65rem 1rem;

    justify-content: center;

    font-size: 0.85rem;
  }


  /* ================= INFO BANNER ================= */

  .info-banner {
    flex-direction: row;

    align-items: center;
    text-align: left;

    padding: 0.95rem 1.1rem;

    gap: 0.8rem;

    margin-bottom: 1.25rem;
  }

  .info-icon {
    width: 38px;
    height: 38px;

    min-width: 38px;
  }

  .info-content {
    font-size: 0.88rem;
    line-height: 1.45;
  }


  /* =====================================================
     DATE FILTER
     ===================================================== */

  .erp-card {
    margin-bottom: 1.25rem;
    border-radius: 15px;
  }

  .erp-card-header {
    padding: 1.15rem 1.25rem;
  }

  .erp-card-header h3 {
    font-size: 1.2rem;
  }

  .erp-card-body {
    padding: 1.25rem;
  }

  .filter-controls {
    gap: 0.9rem !important;
  }

  .filter-group {
    width: 100%;
  }

  .filter-group > div {
    gap: 0.5rem !important;
  }

  .filter-group button {
    min-height: 38px;
    padding: 0.55rem 0.85rem;
  }

  .date-inputs {
    width: 100%;

    display: flex;

    flex-wrap: wrap;

    gap: 0.75rem !important;
  }

  .date-inputs > div {
    flex: 1;
    min-width: 160px;
  }

  .date-inputs input {
    width: 100% !important;
  }

  .date-inputs button {
    width: auto;
  }


  /* =====================================================
     STATISTICS - TABLET
     ===================================================== */

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 1rem;

    margin-bottom: 1.25rem;
  }

  .stat-card {
    width: 100%;

    display: flex;

    flex-direction: column;

    min-width: 0;

    border-radius: 15px;
  }

  .stat-card-header {
    width: 100%;

    padding: 1rem 1.1rem;

    display: flex;

    align-items: center;

    gap: 0.75rem;

    box-sizing: border-box;
  }

  .stat-icon-wrapper {
    width: 48px;
    height: 48px;

    min-width: 48px;

    border-radius: 12px;

    font-size: 1.3rem;
  }

  .stat-title {
    min-width: 0;

    font-size: 0.95rem;

    line-height: 1.3;

    white-space: normal;

    overflow-wrap: normal;

    word-break: normal;
  }

  .stat-card-body {
    width: 100%;

    padding: 1rem 1.1rem;

    box-sizing: border-box;

    min-width: 0;
  }

  .stat-value {
    font-size: 1.9rem;

    line-height: 1.1;

    white-space: nowrap;

    margin-bottom: 0.45rem;
  }

  .stat-trend {
    display: flex;

    align-items: flex-start;

    gap: 0.45rem;

    font-size: 0.78rem;

    line-height: 1.4;

    white-space: normal;
  }

  .trend-icon {
    flex-shrink: 0;

    margin-top: 0.15rem;
  }

  .stat-card-footer {
    width: 100%;

    padding: 0.7rem 1.1rem;

    box-sizing: border-box;

    font-size: 0.78rem;
  }

  .stat-footer-item {
    width: 100%;

    display: flex;

    justify-content: space-between;

    align-items: center;

    gap: 0.75rem;
  }

  .footer-label,
  .footer-value {
    min-width: 0;
  }

  .footer-value {
    text-align: right;

    white-space: nowrap;
  }


  /* =====================================================
     VISUALIZATION
     ===================================================== */

  .visual-container {
    grid-template-columns: 1fr;

    gap: 1.5rem;

    text-align: center;
  }

  .circular-progress {
    gap: 1rem;
  }

  .progress-circle {
    width: 175px;
    height: 175px;
  }

  .progress-circle::before {
    width: 157px;
    height: 157px;
  }

  .progress-value {
    font-size: 2.2rem;
  }

  .progress-label {
    font-size: 1rem;
  }

  .progress-legend {
    width: 100%;

    max-width: 420px;

    margin: 0 auto;
  }

  .horizontal-bar-container {
    gap: 1rem;

    text-align: left;
  }

  .bar-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));

    gap: 0.75rem;
  }

  .metric-item {
    padding: 0.8rem;
  }

  .metric-value {
    font-size: 0.95rem;
  }

  .metric-label {
    font-size: 0.75rem;
  }


  /* =====================================================
     DETAILED METRICS
     ===================================================== */

  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 1rem;
  }

  .metric-card {
    padding: 1rem;

    gap: 0.9rem;
  }

  .metric-icon-wrapper {
    width: 48px;
    height: 48px;

    min-width: 48px;

    border-radius: 13px;
  }

  .metric-title {
    font-size: 0.9rem;
  }

  .metric-value-large {
    font-size: 1.45rem;
  }

  .metric-description {
    font-size: 0.8rem;

    line-height: 1.4;
  }


  /* ================= FOOTER ================= */

  .footer-note {
    padding: 0.85rem 1rem;

    gap: 0.75rem;

    font-size: 0.8rem;
  }

  .refresh-btn {
    width: 34px;
    height: 34px;

    min-width: 34px;
  }
}


/* =========================================================
   MOBILE
   0px - 768px
   ========================================================= */

@media (max-width: 768px) {

  /* ================= CONTAINER ================= */

  .erp-container {
    padding: 0.7rem;
  }


  /* =====================================================
     PAGE HEADER
     ===================================================== */

  .erp-page-header {
    padding: 1rem;

    margin-bottom: 0.9rem;

    border-radius: 14px;

    display: flex;

    flex-direction: column;

    align-items: stretch;

    gap: 0.9rem;
  }

  .erp-header-content {
    width: 100%;

    display: flex;

    align-items: center;

    gap: 0.75rem;
  }

  .erp-header-icon {
    width: 46px;
    height: 46px;

    min-width: 46px;

    border-radius: 11px;

    font-size: 1.3rem;
  }

  .erp-header-text {
    min-width: 0;
    flex: 1;
  }

  .erp-page-title {
    font-size: 1.22rem;

    line-height: 1.2;

    margin: 0;
  }

  .erp-page-subtitle {
    font-size: 0.76rem;

    line-height: 1.4;

    margin-top: 0.3rem;
  }


  /* =====================================================
     HEADER ACTIONS
     ===================================================== */

  .erp-header-actions {
    width: 100%;

    display: grid;

    grid-template-columns: 1fr;

    gap: 0.6rem;
  }

  .export-actions-group {
    width: 100%;
  }

  .export-buttons {
    width: 100%;

    display: grid;

    grid-template-columns: 1fr 1fr;

    gap: 0.55rem;
  }

  .btn-export {
    width: 100%;

    min-width: 0;

    min-height: 40px;

    padding: 0.55rem 0.65rem;

    font-size: 0.78rem;

    border-radius: 8px;
  }

  .erp-header-actions .erp-btn {
    width: 100%;

    min-height: 40px;

    justify-content: center;

    padding: 0.6rem 1rem;

    font-size: 0.82rem;

    border-radius: 8px;
  }


  /* =====================================================
     INFO BANNER
     ===================================================== */

  .info-banner {
    width: 100%;

    flex-direction: row;

    align-items: flex-start;

    text-align: left;

    padding: 0.8rem;

    gap: 0.65rem;

    margin-bottom: 0.9rem;

    border-radius: 11px;
  }

  .info-icon {
    width: 34px;
    height: 34px;

    min-width: 34px;
  }

  .info-content {
    font-size: 0.75rem;

    line-height: 1.45;
  }


  /* =====================================================
     ERP CARD
     ===================================================== */

  .erp-card {
    margin-bottom: 0.9rem;

    border-radius: 14px;
  }

  .erp-card-header {
    padding: 0.9rem 1rem;
  }

  .erp-card-header h3 {
    font-size: 1rem;

    line-height: 1.3;

    gap: 0.55rem;
  }

  .erp-card-icon {
    font-size: 0.95rem;

    flex-shrink: 0;
  }

  .erp-card-body {
    padding: 1rem;
  }


  /* =====================================================
     DATE FILTER
     ===================================================== */

  .filter-controls {
    width: 100%;

    display: flex !important;

    flex-direction: column !important;

    align-items: stretch !important;

    gap: 0.9rem !important;
  }

  .filter-group {
    width: 100%;
  }

  .filter-group label {
    margin-bottom: 0.55rem !important;

    font-size: 0.85rem !important;
  }

  /* Quick filter buttons */

  .filter-group > div {
    width: 100%;

    display: grid !important;

    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 0.55rem !important;
  }

  .filter-group .btn {
    width: 100%;

    min-height: 40px;

    padding: 0.55rem 0.4rem;

    font-size: 0.76rem;

    border-radius: 8px;

    white-space: nowrap;
  }


  /* Custom date inputs */

  .date-inputs {
    width: 100% !important;

    display: grid !important;

    grid-template-columns: 1fr !important;

    gap: 0.7rem !important;

    align-items: stretch !important;
  }

  .date-inputs > div {
    width: 100%;

    min-width: 0;
  }

  .date-inputs label {
    font-size: 0.76rem !important;

    margin-bottom: 0.3rem !important;
  }

  .date-inputs input {
    width: 100% !important;

    height: 40px;
  }

  .date-inputs button {
    width: 100%;

    min-height: 40px;

    align-self: stretch !important;
  }


  /* Apply filter */

  .filter-controls > .btn,
  .filter-controls button.btn-success {
    width: 100%;

    min-height: 40px;

    justify-content: center;
  }


  /* Current filter */

  .erp-card-body > div[style*="marginTop"] {
    width: 100% !important;

    margin-top: 0.85rem !important;

    padding: 0.7rem !important;

    box-sizing: border-box;
  }

  .erp-card-body > div[style*="marginTop"] small {
    font-size: 0.72rem;

    line-height: 1.4;

    display: block;
  }


  /* =====================================================
     STATISTICS
     IMPORTANT:
     Keep each stat card as a normal vertical flex card.
     This prevents titles from becoming vertically stacked.
     ===================================================== */

  .stats-grid {
    width: 100%;

    display: grid;

    grid-template-columns: 1fr;

    gap: 0.75rem;

    margin-bottom: 0.9rem;
  }

  .stat-card {
    width: 100% !important;

    min-width: 0 !important;

    min-height: 0 !important;

    height: auto !important;

    display: flex !important;

    flex-direction: column !important;

    border-radius: 14px;

    overflow: hidden;

    box-sizing: border-box;
  }


  /* ---------------- STAT HEADER ---------------- */

  .stat-card-header {
    width: 100% !important;

    padding: 0.85rem 0.9rem !important;

    display: flex !important;

    flex-direction: row !important;

    align-items: center !important;

    justify-content: flex-start !important;

    gap: 0.65rem !important;

    box-sizing: border-box;

    min-width: 0 !important;

    border-bottom: 1px solid #f0f2f5 !important;
  }

  .stat-icon-wrapper {
    width: 44px !important;

    height: 44px !important;

    min-width: 44px !important;

    max-width: 44px !important;

    flex-shrink: 0 !important;

    border-radius: 11px;

    font-size: 1.2rem;
  }

  .stat-icon {
    font-size: 1.1rem;
  }

  .stat-title {
    display: block !important;

    width: auto !important;

    min-width: 0 !important;

    flex: 1 !important;

    font-size: 0.9rem !important;

    line-height: 1.3 !important;

    font-weight: 600;

    white-space: normal !important;

    overflow-wrap: normal !important;

    word-break: normal !important;
  }


  /* ---------------- STAT BODY ---------------- */

  .stat-card-body {
    width: 100% !important;

    padding: 0.95rem 0.9rem !important;

    display: flex !important;

    flex-direction: column !important;

    align-items: flex-start !important;

    justify-content: center !important;

    box-sizing: border-box;

    min-width: 0 !important;
  }

  .stat-value {
    width: 100%;

    font-size: 1.7rem !important;

    line-height: 1.15 !important;

    margin: 0 0 0.4rem 0 !important;

    white-space: nowrap !important;

    overflow: hidden;

    text-overflow: ellipsis;
  }

  .stat-trend {
    width: 100%;

    display: flex !important;

    align-items: flex-start !important;

    justify-content: flex-start !important;

    gap: 0.4rem !important;

    font-size: 0.72rem !important;

    line-height: 1.4 !important;

    white-space: normal !important;

    overflow-wrap: break-word;

    word-break: normal;
  }

  .trend-icon {
    flex-shrink: 0;

    margin-top: 0.15rem;
  }


  /* ---------------- STAT FOOTER ---------------- */

  .stat-card-footer {
    width: 100% !important;

    padding: 0.65rem 0.9rem !important;

    box-sizing: border-box;

    font-size: 0.72rem !important;
  }

  .stat-footer-item {
    width: 100%;

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 0.6rem;
  }

  .footer-label {
    font-size: 0.72rem;

    color: #6c757d;

    white-space: nowrap;
  }

  .footer-value {
    font-size: 0.72rem;

    text-align: right;

    min-width: 0;

    white-space: nowrap;
  }


  /* =====================================================
     VISUALIZATION
     ===================================================== */

  .visual-container {
    width: 100%;

    display: flex;

    flex-direction: column;

    gap: 1.25rem;

    text-align: center;
  }

  .circular-progress {
    width: 100%;

    gap: 0.9rem;
  }

  .progress-circle {
    width: 145px;
    height: 145px;
  }

  .progress-circle::before {
    width: 129px;
    height: 129px;
  }

  .progress-value {
    font-size: 1.8rem;
  }

  .progress-label {
    font-size: 0.9rem;
  }

  .progress-legend {
    width: 100%;

    gap: 0.55rem;
  }

  .legend-item {
    justify-content: center;

    font-size: 0.75rem;

    gap: 0.5rem;
  }

  .legend-color {
    width: 14px;
    height: 14px;
  }


  /* ---------------- HORIZONTAL BAR ---------------- */

  .horizontal-bar-container {
    width: 100%;

    gap: 0.9rem;

    text-align: left;
  }

  .bar-labels {
    display: flex;

    flex-direction: column;

    align-items: flex-start;

    gap: 0.3rem;
  }

  .bar-title {
    font-size: 0.9rem;
  }

  .bar-total {
    font-size: 0.78rem;
  }

  .horizontal-bar {
    height: 25px;
  }

  .bar-metrics {
    grid-template-columns: 1fr;

    gap: 0.55rem;
  }

  .metric-item {
    width: 100%;

    padding: 0.7rem;

    gap: 0.6rem;

    border-radius: 10px;
  }

  .metric-icon {
    width: 30px;
    height: 30px;

    font-size: 1rem;
  }

  .metric-value {
    font-size: 0.9rem;
  }

  .metric-label {
    font-size: 0.72rem;
  }


  /* =====================================================
     DETAILED METRICS
     ===================================================== */

  .metrics-grid {
    grid-template-columns: 1fr;

    gap: 0.7rem;

    margin-bottom: 1rem;
  }

  .metric-card {
    padding: 0.9rem;

    gap: 0.75rem;

    border-radius: 12px;
  }

  .metric-icon-wrapper {
    width: 44px;
    height: 44px;

    min-width: 44px;

    border-radius: 11px;
  }

  .metric-icon-large {
    font-size: 1.2rem;
  }

  .metric-content {
    min-width: 0;
  }

  .metric-title {
    font-size: 0.82rem;

    margin-bottom: 0.3rem;
  }

  .metric-value-large {
    font-size: 1.3rem;

    margin-bottom: 0.3rem;
  }

  .metric-description {
    font-size: 0.72rem;

    line-height: 1.4;
  }


  /* =====================================================
     METRICS FOOTER
     ===================================================== */

  .metrics-footer {
    display: flex;

    flex-direction: column;

    align-items: flex-start;

    gap: 0.55rem;

    padding-top: 0.9rem;

    margin-top: 0.5rem;
  }

  .metrics-footer .footer-note,
  .metrics-footer .footer-disclaimer {
    width: 100%;

    font-size: 0.7rem;

    line-height: 1.4;
  }


  /* =====================================================
     FOOTER NOTE
     ===================================================== */

  .footer-note {
    width: 100%;

    padding: 0.75rem 0.8rem;

    display: flex;

    flex-direction: row;

    align-items: center;

    gap: 0.55rem;

    font-size: 0.7rem;

    line-height: 1.4;

    text-align: left;

    box-sizing: border-box;
  }

  .footer-note .note-icon {
    font-size: 0.95rem;

    min-width: 16px;
  }

  .refresh-btn {
    width: 32px;
    height: 32px;

    min-width: 32px;

    margin-left: auto;
  }

  .refresh-icon {
    font-size: 0.9rem;
  }
}


/* =========================================================
   SMALL MOBILE
   0px - 480px
   ========================================================= */

@media (max-width: 480px) {

  /* ================= CONTAINER ================= */

  .erp-container {
    padding: 0.55rem;
  }


  /* ================= HEADER ================= */

  .erp-page-header {
    padding: 0.8rem;

    border-radius: 12px;

    gap: 0.75rem;
  }

  .erp-header-content {
    gap: 0.6rem;
  }

  .erp-header-icon {
    width: 42px;
    height: 42px;

    min-width: 42px;

    font-size: 1.1rem;

    border-radius: 10px;
  }

  .erp-page-title {
    font-size: 1.05rem;
  }

  .erp-page-subtitle {
    font-size: 0.68rem;

    line-height: 1.35;
  }


  /* ================= EXPORT ================= */

  .export-buttons {
    gap: 0.45rem;
  }

  .btn-export {
    min-height: 38px;

    padding: 0.5rem 0.35rem;

    font-size: 0.7rem;
  }

  .erp-header-actions .erp-btn {
    min-height: 38px;

    font-size: 0.75rem;
  }


  /* ================= INFO ================= */

  .info-banner {
    padding: 0.7rem;

    gap: 0.55rem;
  }

  .info-icon {
    width: 30px;
    height: 30px;

    min-width: 30px;
  }

  .info-content {
    font-size: 0.69rem;

    line-height: 1.4;
  }


  /* ================= ERP CARD ================= */

  .erp-card {
    border-radius: 12px;

    margin-bottom: 0.75rem;
  }

  .erp-card-header {
    padding: 0.8rem;
  }

  .erp-card-header h3 {
    font-size: 0.9rem;

    gap: 0.45rem;
  }

  .erp-card-body {
    padding: 0.8rem;
  }


  /* ================= FILTER ================= */

  .filter-group label {
    font-size: 0.78rem !important;
  }

  .filter-group > div {
    gap: 0.45rem !important;
  }

  .filter-group .btn {
    min-height: 38px;

    font-size: 0.69rem;

    padding: 0.45rem 0.25rem;
  }

  .date-inputs input {
    height: 38px;
  }

  .date-inputs button {
    min-height: 38px;
  }


  /* =====================================================
     STAT CARDS - SMALL MOBILE
     ===================================================== */

  .stats-grid {
    gap: 0.65rem;
  }

  .stat-card {
    display: flex !important;

    flex-direction: column !important;

    width: 100% !important;

    min-width: 0 !important;

    border-radius: 12px;
  }

  .stat-card-header {
    width: 100% !important;

    padding: 0.72rem !important;

    display: flex !important;

    flex-direction: row !important;

    align-items: center !important;

    gap: 0.55rem !important;

    box-sizing: border-box;
  }

  .stat-icon-wrapper {
    width: 40px !important;

    height: 40px !important;

    min-width: 40px !important;

    max-width: 40px !important;

    border-radius: 9px;

    font-size: 1rem;
  }

  .stat-icon {
    font-size: 1rem;
  }

  .stat-title {
    display: block !important;

    flex: 1 !important;

    min-width: 0 !important;

    width: auto !important;

    font-size: 0.78rem !important;

    line-height: 1.25 !important;

    white-space: normal !important;

    word-break: normal !important;

    overflow-wrap: normal !important;
  }

  .stat-card-body {
    width: 100% !important;

    padding: 0.75rem !important;

    min-width: 0 !important;

    box-sizing: border-box;
  }

  .stat-value {
    width: 100%;

    font-size: 1.45rem !important;

    line-height: 1.15 !important;

    white-space: nowrap !important;

    overflow: hidden;

    text-overflow: ellipsis;

    margin-bottom: 0.35rem !important;
  }

  .stat-trend {
    width: 100%;

    display: flex !important;

    align-items: flex-start !important;

    gap: 0.3rem !important;

    font-size: 0.62rem !important;

    line-height: 1.4 !important;

    white-space: normal !important;
  }

  .trend-icon {
    font-size: 0.65rem;

    flex-shrink: 0;

    margin-top: 0.1rem;
  }

  .stat-card-footer {
    width: 100% !important;

    padding: 0.55rem 0.72rem !important;

    box-sizing: border-box;

    font-size: 0.64rem !important;
  }

  .stat-footer-item {
    width: 100%;

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 0.5rem;
  }

  .footer-label,
  .footer-value {
    font-size: 0.64rem;
  }


  /* ================= VISUALIZATION ================= */

  .progress-circle {
    width: 125px;
    height: 125px;
  }

  .progress-circle::before {
    width: 111px;
    height: 111px;
  }

  .progress-value {
    font-size: 1.55rem;
  }

  .progress-label {
    font-size: 0.8rem;
  }

  .legend-item {
    font-size: 0.68rem;
  }

  .horizontal-bar {
    height: 21px;
  }

  .bar-title {
    font-size: 0.8rem;
  }

  .bar-total {
    font-size: 0.7rem;
  }


  /* ================= METRICS ================= */

  .metric-card {
    padding: 0.75rem;

    gap: 0.6rem;
  }

  .metric-icon-wrapper {
    width: 38px;
    height: 38px;

    min-width: 38px;

    border-radius: 9px;
  }

  .metric-icon-large {
    font-size: 1rem;
  }

  .metric-title {
    font-size: 0.75rem;
  }

  .metric-value-large {
    font-size: 1.15rem;
  }

  .metric-description {
    font-size: 0.65rem;
  }


  /* ================= FOOTER ================= */

  .footer-note {
    padding: 0.65rem;

    font-size: 0.64rem;
  }

  .refresh-btn {
    width: 30px;
    height: 30px;

    min-width: 30px;
  }
}
        /* ================= TREND ANALYSIS ================= */
        .trend-analysis-section {
          margin-top: 2rem;
        }

        .trend-chart-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 2rem;
          margin-top: 1rem;
        }

        .trend-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .trend-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a4b6d;
          margin: 0;
        }

        .year-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .year-select {
          padding: 0.5rem;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-weight: 600;
          color: #1a4b6d;
        }

        .trend-chart-placeholder {
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          border: 2px dashed #dee2e6;
        }

        .trend-placeholder-text {
          text-align: center;
          color: #6c757d;
        }

        .trend-placeholder-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }
      `}</style>

      {/* TREND ANALYSIS SECTION */}
      <div className="trend-analysis-section animate-fade-in">
        <div className="erp-card">
          <div className="erp-card-header">
            <h3>
              <FaChartLine className="erp-card-icon" />
              Payment Collection Trends
            </h3>
            <p className="erp-card-subtitle">
              Monthly payment collection analysis and trends
            </p>
          </div>
          <div className="erp-card-body">
            <div className="trend-header">
              <div>
                <h4 className="trend-title">Monthly Collection Trends</h4>
                <p style={{ margin: '0.25rem 0 0 0', color: '#6c757d', fontSize: '0.875rem' }}>
                  Track payment collection patterns over time
                </p>
              </div>
              <div className="year-selector">
                <label style={{ fontWeight: '600', color: '#1a4b6d' }}>Year:</label>
                <select
                  className="year-select"
                  value={selectedYear}
                  onChange={(e) => {
                    e.preventDefault();
                    const year = parseInt(e.target.value);
                    if (year !== selectedYear) {
                      setSelectedYear(year);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  {yearOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {trendLoading ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#6c757d' }}>
                  <FaSyncAlt style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }} className="spin" />
                  <p>Loading trend data...</p>
                </div>
              </div>
            ) : trendData?.trends && trendData.trends.length > 0 ? (
              <div className="trend-chart-container">
                <ResponsiveContainer key={selectedYear} width="100%" height={300}>
                  <BarChart data={trendData.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                    <XAxis
                      dataKey="monthName"
                      tick={{ fontSize: 12, fill: '#6c757d' }}
                    />
                    <YAxis
                      tickFormatter={(value) => `₹${(value / 1000)}k`}
                      tick={{ fontSize: 12, fill: '#6c757d' }}
                    />
                    <Tooltip
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Collected']}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e9ecef' }}
                    />
                    <Bar
                      dataKey="totalCollected"
                      fill="#1a4b6d"
                      radius={[4, 4, 0, 0]}
                      name="Collection"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="no-data" style={{ padding: '3rem', textAlign: 'center', color: '#6c757d' }}>
                <FaInfoCircle style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
                <h5>No payment data available</h5>
                <p>No payment data found for the selected year.</p>
              </div>
            )}

            {/* Computed statistics from actual payment data */}
            {trendData && (
              <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#28a745' }}>
                    {trendData.bestMonth ? `₹${trendData.bestMonth.totalCollected.toLocaleString()}` : '₹0'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>Best Month Collection</div>
                </div>
                <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#17a2b8' }}>
                    {trendData.bestMonth?.monthName || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>Peak Collection Month</div>
                </div>
                <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: trendData?.yoyGrowth !== undefined && trendData.yoyGrowth >= 0 ? '#28a745' : '#dc3545'
                  }}>
                    {trendData.yoyGrowth !== undefined ? `${trendData.yoyGrowth >= 0 ? '+' : ''}${trendData.yoyGrowth}%` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>Growth vs Last Year</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
