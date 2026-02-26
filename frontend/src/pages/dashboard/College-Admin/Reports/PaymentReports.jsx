import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import api from "../../../../api/axios";
import ExportButtons from "../../../../components/ExportButtons";
import {
  FaMoneyBillWave,
  FaChartPie,
  FaSyncAlt,
  FaExclamationTriangle,
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
  FaArrowLeft,
} from "react-icons/fa";

export default function PaymentReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /* ================= FETCH PAYMENT SUMMARY ================= */
  const fetchPaymentSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/reports/payments/summary");
      setData(res.data || {});
      setRetryCount(0);
    } catch (err) {
      console.error("Payment summary fetch error:", err);
      setError(err.response?.data?.message || "Failed to load payment summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentSummary();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchPaymentSummary();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  };

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
      { metric: "Total Expected Fee", value: formatCurrency(data.totalExpectedFee || 0) },
      { metric: "Total Collected", value: formatCurrency(data.totalCollected || 0) },
      { metric: "Total Pending", value: formatCurrency(data.totalPending || 0) },
      { metric: "Collection Rate", value: `${collectionRate.toFixed(1)}%` },
      { metric: "Pending Rate", value: `${pendingRate.toFixed(1)}%` },
    ];
  };

  /* ================= CALCULATED METRICS ================= */
  const collectionRate = useMemo(() => {
    if (!data || !data.totalExpectedFee || data.totalExpectedFee === 0) return 0;
    return ((data.totalCollected || 0) / data.totalExpectedFee) * 100;
  }, [data]);

  const pendingRate = useMemo(() => {
    if (!data || !data.totalExpectedFee || data.totalExpectedFee === 0) return 0;
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
      ["Pending Rate", `${pendingRate.toFixed(1)}%`]
    ];

    let csvContent = "text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payment_summary_${new Date().toISOString().split('T')[0]}.csv`);
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
        <h3>Payment Reports Error</h3>
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
        <h4 className="erp-loading-text">Loading payment summary reports...</h4>
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
          <li className="breadcrumb-item active" aria-current="page">Payment Summary</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon blink-pulse">
            <FaMoneyBillWave />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Payment Summary Report</h1>
            <p className="erp-page-subtitle">
              Comprehensive overview of fee collection status across all students
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <ExportButtons
            title="Payment Summary Report"
            columns={[
              { header: 'Metric', key: 'metric' },
              { header: 'Value', key: 'value' }
            ]}
            data={getExportData()}
            filename="payment_summary_report"
            showPDF={true}
            showExcel={true}
          />
          <button
            className="erp-btn erp-btn-secondary"
            onClick={fetchPaymentSummary}
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
          <strong>Financial Overview:</strong> This report provides a real-time summary of fee collection status for all students. Data is updated automatically with each transaction.
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
            <div className="stat-value">₹{data.totalExpectedFee?.toLocaleString() || "0"}</div>
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
            <div className="stat-value collected">₹{data.totalCollected?.toLocaleString() || "0"}</div>
            <div className="stat-trend positive">
              <FaCheckCircle className="trend-icon" />
              Collection Rate: {collectionRate.toFixed(1)}%
            </div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-footer-item">
              <span className="footer-label">Status</span>
              <span className={`footer-value ${collectionStatus}`}>
                {collectionStatus.charAt(0).toUpperCase() + collectionStatus.slice(1)}
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
            <div className="stat-value pending">₹{data.totalPending?.toLocaleString() || "0"}</div>
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
                  background: `conic-gradient(#4CAF50 ${collectionRate}%, #e0e0e0 ${collectionRate}% 100%)`
                }}
              >
                <div className="progress-center">
                  <div className="progress-value">{collectionRate.toFixed(0)}%</div>
                  <div className="progress-label">Collected</div>
                </div>
              </div>
              
              <div className="progress-legend">
                <div className="legend-item collected">
                  <span className="legend-color collected"></span>
                  <span>Collected: ₹{data.totalCollected?.toLocaleString() || "0"}</span>
                </div>
                <div className="legend-item pending">
                  <span className="legend-color pending"></span>
                  <span>Pending: ₹{data.totalPending?.toLocaleString() || "0"}</span>
                </div>
              </div>
            </div>

            {/* HORIZONTAL BAR */}
            <div className="horizontal-bar-container">
              <div className="bar-labels">
                <span className="bar-title">Fee Collection Status</span>
                <span className="bar-total">Total: ₹{data.totalExpectedFee?.toLocaleString() || "0"}</span>
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
                    <div className="metric-value">₹{data.totalCollected?.toLocaleString() || "0"}</div>
                    <div className="metric-label">Collected</div>
                  </div>
                </div>
                <div className="metric-item">
                  <FaHourglassHalf className="metric-icon pending" />
                  <div>
                    <div className="metric-value">₹{data.totalPending?.toLocaleString() || "0"}</div>
                    <div className="metric-label">Pending</div>
                  </div>
                </div>
                <div className="metric-item">
                  <FaPercentage className="metric-icon rate" />
                  <div>
                    <div className="metric-value">{collectionRate.toFixed(1)}%</div>
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
                <div className="metric-value-large">{collectionRate.toFixed(1)}%</div>
                <div className="metric-description">
                  {collectionRate >= 90 ? "Excellent collection rate" : 
                   collectionRate >= 75 ? "Good collection rate" : 
                   collectionRate >= 60 ? "Fair collection rate - needs attention" : 
                   "Poor collection rate - immediate action required"}
                </div>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon-wrapper pending">
                <FaHourglassHalf className="metric-icon-large" />
              </div>
              <div className="metric-content">
                <div className="metric-title">Pending Amount</div>
                <div className="metric-value-large">₹{data.totalPending?.toLocaleString() || "0"}</div>
                <div className="metric-description">
                  Requires follow-up with {Math.round(data.totalPending / 5000)} students*
                </div>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon-wrapper expected">
                <FaFileInvoice className="metric-icon-large" />
              </div>
              <div className="metric-content">
                <div className="metric-title">Expected Revenue</div>
                <div className="metric-value-large">₹{data.totalExpectedFee?.toLocaleString() || "0"}</div>
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
                <div className="metric-value-large">90%</div>
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
              <span>* Estimated based on average pending amount per student</span>
            </div>
            <div className="footer-disclaimer">
              <span>Note: All amounts are in Indian Rupees (₹). Data updated in real-time.</span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="footer-note animate-fade-in">
        <FaInfoCircle className="note-icon" />
        <span>
          This report shows real-time payment summary for your college. Data is automatically updated with each transaction. 
          Last refreshed: {new Date().toLocaleString()}
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
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 992px) {
          .visual-container {
            grid-template-columns: 1fr;
            text-align: center;
          }
          
          .bar-metrics {
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
          
          .bar-metrics {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .metrics-grid {
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
          
          .bar-title,
          .bar-total {
            font-size: 1rem;
          }
          
          .metric-value-large {
            font-size: 1.5rem;
          }
          
          .bar-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}