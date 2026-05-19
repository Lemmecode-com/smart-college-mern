import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaReceipt,
  FaChartLine,
  FaPlus,
  FaList,
  FaHistory,
  FaSyncAlt,
  FaRupeeSign,
  FaUsers,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaChartBar
} from "react-icons/fa";

// Brand Colors
const BRAND_COLORS = {
  primary: {
    main: '#1a4b6d',
    dark: '#0f3a4a',
    light: '#2a6b8d',
    gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)'
  },
  success: {
    main: '#28a745',
    dark: '#218838',
    light: '#28a745',
    gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)'
  },
  warning: {
    main: '#ffc107',
    dark: '#e0a800',
    light: '#ffc107',
    gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)'
  },
  danger: {
    main: '#dc3545',
    dark: '#c82333',
    light: '#dc3545',
    gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
  }
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" }
  })
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export default function AccountantDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/payments/report");
      setStats(res.data);
    } catch (err) {
      console.error("Dashboard stats fetch error:", err);
      const errorMsg = err.response?.data?.message || "Failed to load dashboard stats";
      setError({ message: errorMsg, statusCode: err.response?.status });
    } finally {
      setLoading(false);
    }
  };

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Calculate payment status counts
  const calculatePaymentStats = () => {
    if (!stats?.report) return { paid: 0, partial: 0, due: 0 };

    return stats.report.reduce((acc, record) => {
      const paidAmount = record.paidAmount || 0;
      const totalFee = record.totalFee || 0;

      if (paidAmount >= totalFee && totalFee > 0) {
        acc.paid++;
      } else if (paidAmount > 0) {
        acc.partial++;
      } else {
        acc.due++;
      }
      return acc;
    }, { paid: 0, partial: 0, due: 0 });
  };

  const paymentStats = calculatePaymentStats();

  // Navigation handler
  const handleNavigate = (path) => {
    navigate(path);
  };

  // Loading state
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading Accountant Dashboard..." />;
  }

  // Error state
  if (error) {
    return (
      <ApiError
        title="Dashboard Error"
        message={error.message}
        statusCode={error.statusCode}
        onRetry={fetchStats}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  return (
    <div className="accountant-dashboard">
      <style>{`
        .accountant-dashboard {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ================= HEADER ================= */
        .dashboard-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 8px 32px rgba(26, 75, 109, 0.3);
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .dashboard-header p {
          margin: 0.375rem 0 0 0;
          opacity: 0.85;
          font-size: 1rem;
        }

        .time-display {
          font-size: 0.875rem;
          opacity: 0.8;
          font-weight: 500;
        }

        /* ================= STATS CARDS ================= */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          border-left: 4px solid transparent;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        }

        .stat-card.collected { border-left-color: #28a745; }
        .stat-card.students { border-left-color: #17a2b8; }
        .stat-card.paid { border-left-color: #3db5e6; }
        .stat-card.partial { border-left-color: #ffc107; }
        .stat-card.due { border-left-color: #dc3545; }

        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          font-size: 1.5rem;
        }

        .stat-card.collected .stat-icon { background: linear-gradient(135deg, #28a745 0%, #218838 100%); }
        .stat-card.students .stat-icon { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); }
        .stat-card.paid .stat-icon { background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%); }
        .stat-card.partial .stat-icon { background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); }
        .stat-card.due .stat-icon { background: linear-gradient(135deg, #dc3545 0%, #c62828 100%); }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: 0.95rem;
          color: #666;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1a4b6d;
          line-height: 1;
        }

        /* ================= ACTION CARDS ================= */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .action-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .action-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
        }

        .action-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          padding: 1rem 1.25rem;
        }

        .action-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .action-body {
          padding: 1.25rem;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          font-size: 0.95rem;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(26, 75, 109, 0.4);
        }

        .action-btn.secondary {
          background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
        }

        .action-btn.secondary:hover {
          box-shadow: 0 4px 15px rgba(108, 117, 125, 0.4);
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .refresh-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .actions-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>

      <Breadcrumb
        items={[
          { label: "Accountant Dashboard" },
        ]}
      />

      {/* ================= HEADER ================= */}
      <motion.div
        variants={slideDownVariants}
        initial="hidden"
        animate="visible"
        className="dashboard-header"
      >
        <div>
          <h1>
            <FaFileInvoiceDollar />
            Accountant Dashboard
          </h1>
          <p>Manage fee collection, payments, and financial records</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="time-display">
            {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
          </div>
          <Button
            variant="outline-light"
            onClick={fetchStats}
            className="refresh-btn"
          >
            <FaSyncAlt /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* ================= STATS CARDS ================= */}
      <motion.div
        variants={fadeInVariants}
        initial="hidden"
        animate="visible"
        className="stats-grid"
      >
        <div className="stat-card collected">
          <div className="stat-icon">
            <FaMoneyBillWave />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Collected</div>
            <div className="stat-value">{formatCurrency(stats?.totalCollected || 0)}</div>
          </div>
        </div>

        <div className="stat-card students">
          <div className="stat-icon">
            <FaUsers />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Students</div>
            <div className="stat-value">{stats?.totalStudents || 0}</div>
          </div>
        </div>

        <div className="stat-card paid">
          <div className="stat-icon">
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Fully Paid</div>
            <div className="stat-value">{paymentStats.paid}</div>
          </div>
        </div>

        <div className="stat-card partial">
          <div className="stat-icon">
            <FaClock />
          </div>
          <div className="stat-content">
            <div className="stat-label">Partial Payment</div>
            <div className="stat-value">{paymentStats.partial}</div>
          </div>
        </div>

        <div className="stat-card due">
          <div className="stat-icon">
            <FaTimesCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Payment Due</div>
            <div className="stat-value">{paymentStats.due}</div>
          </div>
        </div>
      </motion.div>

      {/* ================= ACTION CARDS ================= */}
      <motion.div
        variants={fadeInVariants}
        initial="hidden"
        animate="visible"
        custom={1}
        className="actions-grid"
      >
        <div className="action-card">
          <div className="action-header">
            <h3>
              <FaFileInvoiceDollar />
              Fee Structure Management
            </h3>
          </div>
          <div className="action-body">
            <div className="action-buttons">
              <button
                className="action-btn"
                onClick={() => handleNavigate("/fees/list")}
              >
                <FaList /> View Fee Structures
              </button>
              <button
                className="action-btn"
                onClick={() => handleNavigate("/fees/create")}
              >
                <FaPlus /> Create Fee Structure
              </button>
            </div>
          </div>
        </div>

        <div className="action-card">
          <div className="action-header">
            <h3>
              <FaReceipt />
              Payment Management
            </h3>
          </div>
          <div className="action-body">
            <div className="action-buttons">
              <button
                className="action-btn"
                onClick={() => handleNavigate("/college-admin/payment-history")}
              >
                <FaHistory /> Payment History
              </button>
              <button
                className="action-btn secondary"
                onClick={() => handleNavigate("/college-admin/reports/payment-summary")}
              >
                <FaChartLine /> Financial Reports
              </button>
            </div>
          </div>
        </div>

        <div className="action-card">
            <div className="action-header">
              <h3>
                <FaChartBar />
                Advanced Analytics
              </h3>
            </div>
            <div className="action-body">
              <div className="action-buttons">
                <button
                  className="action-btn"
                  onClick={() => handleNavigate("/college-admin/payment-history")}
                >
                  <FaHistory /> Payment History
                </button>
                <button
                  className="action-btn secondary"
                  onClick={() => handleNavigate("/college-admin/reports/payment-trends")}
                >
                  <FaChartBar /> Payment Trends
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
  );
}