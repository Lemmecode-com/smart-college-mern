import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import { Button } from "react-bootstrap";
import { motion } from "framer-motion";
import "./AccountantDashboard.css";
import {
   FaFileInvoiceDollar,
   FaMoneyBillWave,
   FaReceipt,
   FaChartLine,
   FaPlus,
   FaList,
   FaHistory,
   FaSyncAlt,
   FaUsers,
   FaUser,
   FaCheckCircle,
   FaClock,
   FaTimesCircle,
   FaChartBar,
   FaExclamationTriangle,
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
      const res = await api.get("/accountant/dashboard");
      setStats(res.data);
     } catch (err) {
       console.error("Dashboard stats fetch error:", err);
       const errorMsg = err.response?.data?.message || "Failed to load dashboard stats";
        setError({ message: errorMsg, statusCode: err.response?.status, errorCode: err.response?.data?.code });
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
  const paymentStats = useMemo(() => {
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
  }, [stats]);

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
        errorCode={error.errorCode}
        onRetry={fetchStats}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  return (
    <div className="accountant-dashboard erp-page erp-viewport-min-100">
      <Breadcrumb
        items={[
          { label: "Accountant Dashboard", path: "/dashboard/accountant" },
          { label: "Dashboard" },
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
            <FaExclamationTriangle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Unpaid Students</div>
            <div className="stat-value">{paymentStats.due}</div>
          </div>
        </div>

        <div className="stat-card overdue">
          <div className="stat-icon">
            <FaTimesCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Critical Overdue</div>
            <div className="stat-value">{stats?.criticalOverdueCount || 0}</div>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">
            <FaMoneyBillWave />
          </div>
          <div className="stat-content">
            <div className="stat-label">Pending from Defaulters</div>
            <div className="stat-value">{formatCurrency(stats?.pendingAmountFromDefaulters || 0)}</div>
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
               <FaMoneyBillWave />
               Offline Payments
             </h3>
           </div>
           <div className="action-body">
             <div className="action-buttons">
               <button
                 className="action-btn"
                 onClick={() => handleNavigate("/accountant/record-offline-payment")}
               >
                 <FaPlus /> Record Offline Payment
               </button>
               <button
                 className="action-btn secondary"
                 onClick={() => handleNavigate("/accountant/defaulters")}
               >
                 <FaTimesCircle /> Defaulter List
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
               Analytics & Reports
             </h3>
           </div>
           <div className="action-body">
             <div className="action-buttons">
               <button
                 className="action-btn"
                 onClick={() => handleNavigate("/college-admin/reports/payment-trends")}
               >
                 <FaChartBar /> Payment Trends
               </button>
               <button
                 className="action-btn secondary"
                 onClick={() => handleNavigate("/college-admin/student-reports")}
               >
                 <FaUser /> Student Reports
               </button>
             </div>
           </div>
         </div>
       </motion.div>
      </div>
  );
}