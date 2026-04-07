import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import ExportButtons from "../../../components/ExportButtons";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";
import {
  FaFileInvoiceDollar,
  FaSearch,
  FaFilter,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaReceipt,
  FaSyncAlt,
  FaDownload,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaExternalLinkAlt,
} from "react-icons/fa";

const PAGE_SIZE = 10;

export default function PaymentHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState(null); // Store row index for active dropdown

  // Fetch payment history from backend
  const fetchPaymentHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/payments/report");
      setPaymentData(res.data);
      toast.success("Payment history loaded successfully!", {
        position: "top-right",
        autoClose: 3000,
        toastId: "payment-history-success",
      });
    } catch (err) {
      console.error("Payment history fetch error:", err);
      const statusCode = err.response?.status;
      const errorMsg =
        err.response?.data?.message ||
        "Failed to load payment history. Please try again.";
      setError({ message: errorMsg, statusCode });
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        toastId: "payment-history-error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Calculate payment status for a student fee record
  const calculateStatus = (paidAmount, totalFee) => {
    if (totalFee === 0) return "N/A";
    if (paidAmount >= totalFee) return "PAID";
    if (paidAmount === 0) return "DUE";
    return "PARTIAL";
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    const classes = {
      PAID: "status-paid",
      PARTIAL: "status-partial",
      DUE: "status-due",
      "N/A": "status-na",
    };
    return classes[status] || "status-default";
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "PAID":
        return <FaCheckCircle />;
      case "PARTIAL":
        return <FaClock />;
      case "DUE":
        return <FaTimesCircle />;
      default:
        return <FaMoneyBillWave />;
    }
  };

  // Flatten installments for detailed view
  const getInstallmentDetails = (record) => {
    if (!record.installments || record.installments.length === 0) return [];
    return record.installments.map((inst, idx) => ({
      _id: inst._id, // IMPORTANT: MongoDB _id for receipt link
      name: inst.name || `Installment ${idx + 1}`,
      amount: inst.amount || 0,
      status: inst.status || (inst.paidAt ? "PAID" : "PENDING"),
      paidAt: inst.paidAt || null,
      transactionId: inst.transactionId || null,
      paymentGateway: inst.paymentGateway || null,
    }));
  };

  // Toggle dropdown for a specific row (using index)
  const toggleDropdown = (rowIndex, event) => {
    event.stopPropagation();
    setActiveDropdown((prev) => (prev === rowIndex ? null : rowIndex));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".receipt-dropdown-wrapper")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    return () => {
      setActiveDropdown(null);
    };
  }, [navigate]);

  // Filter and search logic
  const filteredRecords = useMemo(() => {
    if (!paymentData?.report) return [];

    return paymentData.report
      .filter((record) => {
        const status = calculateStatus(record.paidAmount, record.totalFee);
        const matchesStatus = statusFilter ? status === statusFilter : true;
        const studentName = record.student?.fullName?.toLowerCase() || "";
        const courseName = record.course?.name?.toLowerCase() || "";
        const matchesSearch = searchQuery
          ? studentName.includes(searchQuery.toLowerCase()) ||
            courseName.includes(searchQuery.toLowerCase())
          : true;
        return matchesStatus && matchesSearch;
      })
      .map((record) => ({
        ...record,
        calculatedStatus: calculateStatus(record.paidAmount, record.totalFee),
      }));
  }, [paymentData, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  // Prepare export data
  const getExportData = () => {
    return filteredRecords.map((record) => {
      const installments = getInstallmentDetails(record);
      const paidInstallments = installments.filter((i) => i.status === "PAID");
      return {
        "Student Name": record.student?.fullName || "N/A",
        Email: record.student?.email || "N/A",
        Course: record.course?.name || "N/A",
        "Total Fee": formatCurrency(record.totalFee),
        "Paid Amount": formatCurrency(record.paidAmount),
        "Pending Amount": formatCurrency(record.pendingAmount),
        Status: record.calculatedStatus,
        "Paid Installments": paidInstallments.map((i) => i.name).join(", "),
        "Transaction IDs": paidInstallments
          .map((i) => i.transactionId || "N/A")
          .join(", "),
        "Payment Dates": paidInstallments
          .map((i) =>
            i.paidAt ? new Date(i.paidAt).toLocaleDateString() : "N/A",
          )
          .join(", "),
      };
    });
  };

  const exportColumns = [
    { header: "Student Name", key: "Student Name" },
    { header: "Email", key: "Email" },
    { header: "Course", key: "Course" },
    { header: "Total Fee", key: "Total Fee" },
    { header: "Paid Amount", key: "Paid Amount" },
    { header: "Pending Amount", key: "Pending Amount" },
    { header: "Status", key: "Status" },
    { header: "Paid Installments", key: "Paid Installments" },
    { header: "Transaction IDs", key: "Transaction IDs" },
    { header: "Payment Dates", key: "Payment Dates" },
  ];

  // Loading state
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading payment history..." />;
  }

  // Error state
  if (error) {
    return (
      <ApiError
        title="Error Loading Payment History"
        message={error.message}
        statusCode={error.statusCode}
        onRetry={fetchPaymentHistory}
        onGoBack={() => navigate(-1)}
        retryCount={0}
        maxRetry={3}
        isRetryLoading={loading}
      />
    );
  }

  // Summary stats
  const summaryStats = {
    totalCollected: paymentData?.totalCollected || 0,
    totalStudents: paymentData?.totalStudents || 0,
    paidCount: filteredRecords.filter((r) => r.calculatedStatus === "PAID")
      .length,
    partialCount: filteredRecords.filter(
      (r) => r.calculatedStatus === "PARTIAL",
    ).length,
    dueCount: filteredRecords.filter((r) => r.calculatedStatus === "DUE")
      .length,
  };

  return (
    <div className="payment-history-container">
      <style>{`
        /* ================= CONTAINER ================= */
        .payment-history-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ================= HEADER ================= */
        .payment-history-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(26, 75, 109, 0.3);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .payment-history-header h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .payment-history-header p {
          margin: 0.375rem 0 0 0;
          opacity: 0.85;
          font-size: 1rem;
        }

        /* ================= SUMMARY CARDS ================= */
        .payment-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .payment-summary-card {
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

        .payment-summary-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        }

        .payment-summary-card.collected {
          border-left-color: #28a745;
        }

        .payment-summary-card.paid {
          border-left-color: #3db5e6;
        }

        .payment-summary-card.partial {
          border-left-color: #ffc107;
        }

        .payment-summary-card.due {
          border-left-color: #dc3545;
        }

        .payment-summary-icon {
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

        .payment-summary-card.collected .payment-summary-icon {
          background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
        }

        .payment-summary-card.paid .payment-summary-icon {
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
        }

        .payment-summary-card.partial .payment-summary-icon {
          background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
        }

        .payment-summary-card.due .payment-summary-icon {
          background: linear-gradient(135deg, #dc3545 0%, #c62828 100%);
        }

        .payment-summary-content {
          flex: 1;
        }

        .payment-summary-label {
          font-size: 0.95rem;
          color: #666;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .payment-summary-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1a4b6d;
          line-height: 1;
        }

        /* ================= CONTROLS CARD ================= */
        .payment-controls-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
          overflow: hidden;
        }

        .payment-controls-body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.75rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .payment-search-box {
          position: relative;
          flex: 1;
          min-width: 280px;
        }

        .payment-search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
          font-size: 1rem;
        }

        .payment-search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }

        .payment-search-input:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
          outline: none;
        }

        .payment-filter-dropdown {
          position: relative;
        }

        .payment-filter-select {
          padding: 0.75rem 1.25rem;
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-weight: 500;
          color: #2c3e50;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.95rem;
        }

        .payment-filter-select:focus {
          border-color: #1a4b6d;
          outline: none;
        }

        /* ================= TABLE CARD ================= */
        .payment-table-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .payment-table-header {
          padding: 1.5rem 1.75rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .payment-table-header h3 {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
          color: #1a4b6d;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .payment-record-count {
          background: rgba(26, 75, 109, 0.1);
          color: #1a4b6d;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .payment-table-container {
          overflow-x: auto;
          overflow-y: visible;
        }

        .payment-table {
          width: 100%;
          border-collapse: collapse;
          overflow: visible;
        }

        .payment-table tbody tr {
          position: relative;
        }

        .payment-table thead {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
        }

        .payment-table th {
          padding: 16px 20px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: none;
          white-space: nowrap;
        }

        .payment-table tbody tr {
          transition: all 0.25s ease;
          border-bottom: 1px solid #e2e8f0;
        }

        .payment-table tbody tr:hover {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        }

        .payment-table td {
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .payment-student-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .payment-student-name {
          font-weight: 700;
          color: #0f3a4a;
          font-size: 15px;
        }

        .payment-student-email {
          font-size: 13px;
          color: #64748b;
        }

        .payment-course-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 24px;
          font-size: 12px;
          font-weight: 700;
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
          color: white;
          box-shadow: 0 2px 6px rgba(15, 58, 74, 0.3);
        }

        .payment-amount-cell {
          font-weight: 600;
          color: #475569;
          font-size: 14px;
        }

        .payment-amount-paid {
          color: #28a745;
          font-weight: 700;
        }

        .payment-amount-pending {
          color: #dc3545;
          font-weight: 700;
        }

        .payment-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 24px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-paid {
          background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
          color: white;
          box-shadow: 0 2px 6px rgba(40, 167, 69, 0.3);
        }

        .status-partial {
          background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
          color: white;
          box-shadow: 0 2px 6px rgba(255, 193, 7, 0.3);
        }

        .status-due {
          background: linear-gradient(135deg, #dc3545 0%, #c62828 100%);
          color: white;
          box-shadow: 0 2px 6px rgba(220, 53, 69, 0.3);
        }

        .status-na {
          background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
          color: white;
        }

        .payment-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          white-space: nowrap;
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          color: white;
          box-shadow: 0 3px 10px rgba(61, 181, 230, 0.3);
        }

        .payment-action-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(61, 181, 230, 0.4);
        }

        /* ================= RECEIPT DROPDOWN STYLES ================= */
        .payment-actions-cell {
          text-align: center;
          position: static;
          overflow: visible;
        }

        .payment-actions-cell > * {
          position: relative;
        }

        .receipt-dropdown-wrapper {
          position: relative;
          display: inline-block;
          z-index: 1;
        }

        .receipt-dropdown-wrapper.active {
          z-index: 10001;
          transform: translateZ(0);
        }

        .receipt-dropdown-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 1rem;
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          position: relative;
          overflow: hidden;
        }

        .receipt-dropdown-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .receipt-dropdown-btn:hover::before {
          left: 100%;
        }

        .receipt-dropdown-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
        }

        .receipt-dropdown-btn:active {
          transform: translateY(0);
        }

        .receipt-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }

        .receipt-btn-text {
          white-space: nowrap;
        }

        .receipt-count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 0.5rem;
          background: rgba(255, 255, 255, 0.95);
          color: #1e40af;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .dropdown-arrow {
          font-size: 0.75rem;
          transition: transform 0.3s ease;
          flex-shrink: 0;
        }

        .receipt-dropdown-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          min-width: 320px;
          max-width: 400px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 100000 !important;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          pointer-events: auto;
          transform-origin: top right;
        }

        @keyframes dropdownSlideIn {
          from {
            opacity: 0;
            transform: translateY(-5px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .dropdown-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          color: #1e40af;
          font-weight: 700;
          font-size: 0.9375rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .dropdown-icon {
          font-size: 1.125rem;
        }

        .dropdown-divider {
          height: 1px;
          background: #e5e7eb;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.875rem 1.25rem;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
          cursor: pointer;
          border-left: 3px solid transparent;
        }

        .dropdown-item:hover {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-left-color: #3b82f6;
        }

        .dropdown-item:not(:last-child) {
          border-bottom: 1px solid #f3f4f6;
        }

        .dropdown-item-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .dropdown-item-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
        }

        .dropdown-item-name {
          font-weight: 600;
          font-size: 0.9375rem;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dropdown-item-date {
          font-size: 0.8125rem;
          color: #6b7280;
        }

        .dropdown-item-amount {
          font-weight: 700;
          font-size: 1rem;
          color: #10b981;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .dropdown-item-arrow {
          color: #9ca3af;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .dropdown-item:hover .dropdown-item-arrow {
          color: #3b82f6;
          transform: translateX(4px);
        }

        .no-receipts-text {
          color: #9ca3af;
          font-size: 0.875rem;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .receipt-dropdown-menu {
            position: fixed;
            left: 1rem;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            max-width: none;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
          }

          .receipt-dropdown-btn {
            padding: 0.5rem 0.75rem;
            font-size: 0.8125rem;
          }

          .receipt-count-badge {
            min-width: 20px;
            height: 20px;
            font-size: 0.6875rem;
          }
        }

        .payment-empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #666;
        }

        .payment-empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, rgba(26, 75, 109, 0.1) 0%, rgba(15, 58, 74, 0.1) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a4b6d;
          font-size: 2.5rem;
        }

        .payment-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          border-top: 1px solid #e9ecef;
          gap: 0.5rem;
        }

        .payment-page-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: none;
          background: #f8f9fa;
          color: #1a4b6d;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .payment-page-btn:hover:not(:disabled) {
          background: #e9ecef;
          transform: translateY(-1px);
        }

        .payment-page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .payment-page-btn.active {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
        }

        .payment-page-numbers {
          display: flex;
          gap: 0.25rem;
        }

        @media (max-width: 768px) {
          .payment-history-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .payment-summary-grid {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          }

          .payment-controls-body {
            flex-direction: column;
            align-items: stretch;
          }

          .payment-search-box {
            min-width: auto;
          }

          .payment-table {
            min-width: 650px;
          }
        }
      `}</style>

      {/* ================= BREADCRUMB ================= */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Payment History" },
        ]}
      />

      {/* ================= HEADER ================= */}
      <div className="payment-history-header">
        <div>
          <h1>
            <FaFileInvoiceDollar />
            Payment History
          </h1>
          <p>View and manage all student fee payment records</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="payment-action-btn"
            onClick={fetchPaymentHistory}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
            }}
          >
            <FaSyncAlt /> Refresh
          </button>
          <ExportButtons
            title="Payment History Report"
            columns={exportColumns}
            data={getExportData()}
            filename={`payment_history_${new Date().toISOString().split("T")[0]}`}
            showCSV
            showPDF
            showExcel
          />
        </div>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="payment-summary-grid">
        <div className="payment-summary-card collected">
          <div className="payment-summary-icon">
            <FaMoneyBillWave />
          </div>
          <div className="payment-summary-content">
            <div className="payment-summary-label">Total Collected</div>
            <div className="payment-summary-value">
              {formatCurrency(summaryStats.totalCollected)}
            </div>
          </div>
        </div>

        <div className="payment-summary-card paid">
          <div className="payment-summary-icon">
            <FaCheckCircle />
          </div>
          <div className="payment-summary-content">
            <div className="payment-summary-label">Fully Paid</div>
            <div className="payment-summary-value">
              {summaryStats.paidCount}
            </div>
          </div>
        </div>

        <div className="payment-summary-card partial">
          <div className="payment-summary-icon">
            <FaClock />
          </div>
          <div className="payment-summary-content">
            <div className="payment-summary-label">Partial Payment</div>
            <div className="payment-summary-value">
              {summaryStats.partialCount}
            </div>
          </div>
        </div>

        <div className="payment-summary-card due">
          <div className="payment-summary-icon">
            <FaTimesCircle />
          </div>
          <div className="payment-summary-content">
            <div className="payment-summary-label">Payment Due</div>
            <div className="payment-summary-value">{summaryStats.dueCount}</div>
          </div>
        </div>
      </div>

      {/* ================= CONTROLS ================= */}
      <div className="payment-controls-card">
        <div className="payment-controls-body">
          <div className="payment-search-box">
            <FaSearch className="payment-search-icon" />
            <input
              type="text"
              placeholder="Search by student name or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="payment-search-input"
            />
          </div>

          <div className="payment-filter-dropdown">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="payment-filter-select"
            >
              <option value="">All Status</option>
              <option value="PAID">✅ Paid</option>
              <option value="PARTIAL">⏳ Partial</option>
              <option value="DUE">❌ Due</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="payment-table-card">
        <div className="payment-table-header">
          <h3>
            <FaFileInvoiceDollar />
            Student Payment Records
          </h3>
          <span className="payment-record-count">
            {filteredRecords.length}{" "}
            {filteredRecords.length === 1 ? "Student" : "Students"}
          </span>
        </div>

        <div className="payment-table-container">
          {paginatedRecords.length === 0 ? (
            <div className="payment-empty-state">
              <div className="payment-empty-icon">
                <FaFileInvoiceDollar />
              </div>
              <h3>No Payment Records Found</h3>
              <p>
                {searchQuery || statusFilter
                  ? "No records match your search criteria. Try adjusting your filters."
                  : "There are no payment records to display."}
              </p>
            </div>
          ) : (
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Total Fee</th>
                  <th>Paid Amount</th>
                  <th>Pending</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record, idx) => {
                  const installments = getInstallmentDetails(record);
                  const paidInstallments = installments.filter(
                    (i) => i.status === "PAID",
                  );
                  const transactionIds = paidInstallments
                    .map((i) => i.transactionId)
                    .filter(Boolean)
                    .join(", ");
                  const paymentDates = paidInstallments
                    .map((i) =>
                      i.paidAt
                        ? new Date(i.paidAt).toLocaleDateString("en-IN")
                        : null,
                    )
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <tr key={record.student_id?._id || `student-${idx}`}>
                      <td>
                        <div className="payment-student-info">
                          <span className="payment-student-name">
                            {record.student?.fullName || "N/A"}
                          </span>
                          <span className="payment-student-email">
                            {record.student?.email || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="payment-course-badge">
                          {record.course?.name || "N/A"}
                        </span>
                      </td>
                      <td className="payment-amount-cell">
                        {formatCurrency(record.totalFee)}
                      </td>
                      <td className="payment-amount-cell payment-amount-paid">
                        {formatCurrency(record.paidAmount)}
                      </td>
                      <td className="payment-amount-cell payment-amount-pending">
                        {formatCurrency(record.pendingAmount)}
                      </td>
                      <td>
                        <span
                          className={`payment-status-badge ${getStatusBadgeClass(record.calculatedStatus)}`}
                        >
                          {getStatusIcon(record.calculatedStatus)}
                          {record.calculatedStatus}
                        </span>
                      </td>
                      <td className="payment-actions-cell">
                        {paidInstallments.length > 0 ? (
                          <div
                            className={`receipt-dropdown-wrapper ${
                              activeDropdown === idx ? "active" : ""
                            }`}
                          >
                            <button
                              className="receipt-dropdown-btn"
                              onClick={(e) => toggleDropdown(idx, e)}
                              aria-expanded={activeDropdown === idx}
                              aria-haspopup="true"
                            >
                              <FaReceipt className="receipt-icon" />
                              <span className="receipt-btn-text">Receipts</span>
                              <span className="receipt-count-badge">
                                {paidInstallments.length}
                              </span>
                              {activeDropdown === idx ? (
                                <FaChevronUp className="dropdown-arrow" />
                              ) : (
                                <FaChevronDown className="dropdown-arrow" />
                              )}
                            </button>

                            {activeDropdown === idx ? (
                              <div className="receipt-dropdown-menu">
                                <div className="dropdown-header">
                                  <FaReceipt className="dropdown-icon" />
                                  <span>Payment Receipts</span>
                                </div>
                                <div className="dropdown-divider" />
                                {paidInstallments.map((inst, instIdx) => (
                                  <Link
                                    key={instIdx}
                                    to={`/student/fee-receipt/${inst._id}`}
                                    className="dropdown-item"
                                    onClick={() => setActiveDropdown(null)}
                                  >
                                    <div className="dropdown-item-icon">
                                      <FaReceipt />
                                    </div>
                                    <div className="dropdown-item-content">
                                      <span className="dropdown-item-name">
                                        {inst.name}
                                      </span>
                                      <span className="dropdown-item-date">
                                        {inst.paidAt
                                          ? `Paid: ${new Date(inst.paidAt).toLocaleDateString("en-IN")}`
                                          : "Payment date unavailable"}
                                      </span>
                                    </div>
                                    <div className="dropdown-item-amount">
                                      {formatCurrency(inst.amount)}
                                    </div>
                                    <FaExternalLinkAlt className="dropdown-item-arrow" />
                                  </Link>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="no-receipts-text">No Receipts</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ================= PAGINATION ================= */}
        {totalPages > 1 && (
          <div className="payment-pagination">
            <button
              className="payment-page-btn"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <FaChevronLeft />
            </button>

            <div className="payment-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (num) => (
                  <button
                    key={num}
                    className={`payment-page-btn ${currentPage === num ? "active" : ""}`}
                    onClick={() => setCurrentPage(num)}
                    aria-label={`Page ${num}`}
                    aria-current={currentPage === num ? "page" : undefined}
                  >
                    {num}
                  </button>
                ),
              )}
            </div>

            <button
              className="payment-page-btn"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
