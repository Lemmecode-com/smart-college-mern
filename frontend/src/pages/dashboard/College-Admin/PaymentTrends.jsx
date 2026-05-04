import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import {
  FaChartBar,
  FaArrowLeft,
  FaSyncAlt,
  FaCalendarAlt,
  FaRupeeSign,
  FaChartLine,
  FaInfoCircle
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function PaymentTrends() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Security check
  if (!user) {
    navigate("/login");
    return null;
  }

  if (user.role !== "COLLEGE_ADMIN" && user.role !== "ACCOUNTANT" && user.role !== "PRINCIPAL") {
    navigate("/dashboard");
    return null;
  }

  // Fetch trends data
  const fetchTrendsData = useCallback(async (year = selectedYear) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/reports/payments/trends?year=${year}`);
      setTrendsData(response.data.data);

      toast.success(`Payment trends loaded for ${year}`, {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      console.error("Payment trends fetch error:", err);
      const errorMsg = err.response?.data?.message || "Failed to load payment trends";
      setError({ message: errorMsg, statusCode: err.response?.status });
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchTrendsData();
  }, [selectedYear]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Calculate analytics from trends data
  const calculateAnalytics = () => {
    if (!trendsData?.trends) return null;

    const trends = trendsData.trends;
    const totalCollections = trends.reduce((sum, t) => sum + t.totalCollected, 0);
    const totalTransactions = trends.reduce((sum, t) => sum + t.transactionCount, 0);

    // Find peak month
    const peakMonth = trends.reduce((max, t) =>
      t.totalCollected > max.totalCollected ? t : max, trends[0]
    );

    // Calculate growth (compare with previous year if available)
    const currentYearTotal = totalCollections;
    const avgMonthly = totalCollections / 12;

    return {
      totalCollections,
      totalTransactions,
      avgMonthly,
      peakMonth,
      currentYearTotal
    };
  };

  const analytics = calculateAnalytics();

  // Loading state
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading payment trends..." />;
  }

  // Error state
  if (error) {
    return (
      <ApiError
        title="Error Loading Payment Trends"
        message={error.message}
        statusCode={error.statusCode}
        onRetry={() => fetchTrendsData()}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%)',
      padding: '1.5rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <style>{`
        .trends-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .trends-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-content h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 700;
        }

        .header-content p {
          margin: 0;
          opacity: 0.9;
          font-size: 1rem;
        }

        .year-selector {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .year-select {
          padding: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 600;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .analytics-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          border-left: 4px solid transparent;
        }

        .analytics-card.total { border-left-color: #28a745; }
        .analytics-card.average { border-left-color: #17a2b8; }
        .analytics-card.peak { border-left-color: #ffc107; }
        .analytics-card.transactions { border-left-color: #1a4b6d; }

        .analytics-value {
          font-size: 2rem;
          font-weight: 700;
          color: #1a4b6d;
          margin: 0.5rem 0;
        }

        .analytics-label {
          font-size: 0.9rem;
          color: #6c757d;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .analytics-desc {
          font-size: 0.85rem;
          color: #6c757d;
        }

        .chart-section {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .chart-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a4b6d;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .bar-chart {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 0.5rem;
          height: 300px;
          align-items: end;
          margin-top: 2rem;
        }

        .bar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .bar {
          width: 100%;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          border-radius: 4px 4px 0 0;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .bar:hover {
          opacity: 0.8;
          transform: translateY(-2px);
        }

        .bar-value {
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.75rem;
          font-weight: 600;
          color: #1a4b6d;
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .bar:hover .bar-value {
          opacity: 1;
        }

        .bar-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #6c757d;
          text-align: center;
        }

        .monthly-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 2rem;
        }

        .monthly-table th,
        .monthly-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #e9ecef;
        }

        .monthly-table th {
          font-weight: 600;
          color: #1a4b6d;
          background: #f8f9fa;
        }

        .monthly-table tr:hover {
          background: #f8f9fa;
        }

        .no-data {
          text-align: center;
          padding: 3rem;
          color: #6c757d;
        }

        .no-data-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .refresh-btn {
          background: linear-gradient(135deg, #28a745 0%, #218838 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .refresh-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        }

        @media (max-width: 768px) {
          .trends-header {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .analytics-grid {
            grid-template-columns: 1fr;
          }

          .bar-chart {
            grid-template-columns: repeat(6, 1fr);
            height: 250px;
          }

          .year-selector {
            flex-direction: column;
            width: 100%;
          }
        }
      `}</style>

      <Breadcrumb
        items={[
          { label: "Dashboard", path: user?.role === "ACCOUNTANT" ? "/dashboard/accountant" : "/dashboard" },
          { label: "Payment Trends" },
        ]}
      />

      <div className="trends-container">
        {/* HEADER */}
        <div className="trends-header">
          <div className="header-content">
            <h1>Payment Collection Trends</h1>
            <p>Analyze payment patterns and collection performance over time</p>
          </div>

          <div className="year-selector">
            <label style={{ fontWeight: '600' }}>Select Year:</label>
            <select
              className="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
            <button className="refresh-btn" onClick={() => fetchTrendsData()}>
              <FaSyncAlt />
              Refresh
            </button>
          </div>
        </div>

        {/* ANALYTICS CARDS */}
        {analytics && (
          <div className="analytics-grid">
            <div className="analytics-card total">
              <div className="analytics-label">Total Collections</div>
              <div className="analytics-value">{formatCurrency(analytics.totalCollections)}</div>
              <div className="analytics-desc">Total payments collected in {selectedYear}</div>
            </div>

            <div className="analytics-card average">
              <div className="analytics-label">Average Monthly</div>
              <div className="analytics-value">{formatCurrency(analytics.avgMonthly)}</div>
              <div className="analytics-desc">Average collection per month</div>
            </div>

            <div className="analytics-card peak">
              <div className="analytics-label">Peak Month</div>
              <div className="analytics-value">{analytics.peakMonth?.monthName || 'N/A'}</div>
              <div className="analytics-desc">
                {analytics.peakMonth ? formatCurrency(analytics.peakMonth.totalCollected) + ' collected' : 'No data available'}
              </div>
            </div>

            <div className="analytics-card transactions">
              <div className="analytics-label">Total Transactions</div>
              <div className="analytics-value">{analytics.totalTransactions}</div>
              <div className="analytics-desc">Number of payment transactions</div>
            </div>
          </div>
        )}

        {/* CHART SECTION */}
        <div className="chart-section">
          <div className="chart-header">
            <h2 className="chart-title">
              <FaChartBar />
              Monthly Collection Trends - {selectedYear}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6c757d', fontSize: '0.9rem' }}>
              <FaInfoCircle />
              Hover bars for exact values
            </div>
          </div>

          {trendsData?.trends && trendsData.trends.length > 0 ? (
            <>
              {/* BAR CHART */}
              <div className="bar-chart">
                {trendsData.trends.map((monthData, index) => {
                  const maxValue = Math.max(...trendsData.trends.map(t => t.totalCollected));
                  const heightPercent = maxValue > 0 ? (monthData.totalCollected / maxValue) * 100 : 0;

                  return (
                    <div key={index} className="bar-container">
                      <div
                        className="bar"
                        style={{
                          height: `${Math.max(heightPercent, 5)}%`,
                          background: monthData.totalCollected > analytics?.avgMonthly
                            ? 'linear-gradient(135deg, #28a745 0%, #218838 100%)'
                            : 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)'
                        }}
                      >
                        <div className="bar-value">
                          {formatCurrency(monthData.totalCollected)}
                        </div>
                      </div>
                      <div className="bar-label">{monthData.monthName.slice(0, 3)}</div>
                    </div>
                  );
                })}
              </div>

              {/* MONTHLY TABLE */}
              <table className="monthly-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total Collected</th>
                    <th>Transactions</th>
                    <th>Average per Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {trendsData.trends.map((monthData, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: '600' }}>{monthData.monthName}</td>
                      <td>{formatCurrency(monthData.totalCollected)}</td>
                      <td>{monthData.transactionCount}</td>
                      <td>
                        {monthData.transactionCount > 0
                          ? formatCurrency(monthData.totalCollected / monthData.transactionCount)
                          : formatCurrency(0)
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="no-data">
              <FaChartBar className="no-data-icon" />
              <h3>No Data Available</h3>
              <p>No payment data found for the selected year.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}