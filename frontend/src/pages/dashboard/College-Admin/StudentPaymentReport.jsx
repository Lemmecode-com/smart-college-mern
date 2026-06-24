import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import {
  FaUser,
  FaRupeeSign,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaArrowLeft,
  FaFilter,
  FaSyncAlt,
  FaDownload
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function StudentPaymentReport() {
  const { user } = useContext(AuthContext);
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDateFilters, setShowDateFilters] = useState(false);

  // Security check
  if (!user) {
    navigate("/login");
    return null;
  }

  if (user.role !== "COLLEGE_ADMIN" && user.role !== "ACCOUNTANT" && user.role !== "PRINCIPAL") {
    navigate("/dashboard");
    return null;
  }

  // Fetch student payment data
  const fetchStudentPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      let queryParams = {};
      if (startDate) queryParams.startDate = startDate;
      if (endDate) queryParams.endDate = endDate;

      const queryString = new URLSearchParams(queryParams).toString();
      const url = `/reports/payments/student/${studentId}${queryString ? `?${queryString}` : ''}`;

      const res = await api.get(url);

      if (res.data && res.data.length > 0) {
        setStudentData(res.data[0]);
        setPaymentHistory(res.data[0].installments || []);
      } else {
        setStudentData(null);
        setPaymentHistory([]);
      }

      toast.success("Student payment data loaded successfully!", {
        position: "top-right",
        autoClose: 3000,
        toastId: "student-payment-success",
      });
    } catch (err) {
      console.error("Student payment fetch error:", err);
      const errorMsg = err.response?.data?.message || "Failed to load student payment data.";
      setError({ message: errorMsg, statusCode: err.response?.status });
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        toastId: "student-payment-error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentPaymentData();
  }, [studentId, startDate, endDate]);

  // Calculate totals
  const calculateTotals = () => {
    const paidInstallments = paymentHistory.filter(inst => inst.status === "PAID");
    const totalPaid = paidInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
    const totalExpected = studentData?.totalFee || 0;
    const pending = totalExpected - totalPaid;

    return {
      totalExpected,
      totalPaid,
      pending,
      paidCount: paidInstallments.length,
      totalCount: paymentHistory.length
    };
  };

  const totals = calculateTotals();

  // Loading state
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading student payment report..." />;
  }

  // Error state
  if (error) {
    return (
      <ApiError
        title="Error Loading Student Payment Report"
        message={error.message}
        statusCode={error.statusCode}
        onRetry={fetchStudentPaymentData}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  return (
    <div className="student-payment-report">
      <style>{`
        .student-payment-report {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .report-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .student-info {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .student-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(61, 181, 230, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: #3db5e6;
        }

        .student-details h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          font-weight: 700;
        }

        .student-meta {
          display: flex;
          gap: 2rem;
          opacity: 0.9;
        }

        .student-meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .back-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 1rem;
          border-left: 4px solid transparent;
        }

        .summary-card.expected { border-left-color: #1a4b6d; }
        .summary-card.paid { border-left-color: #28a745; }
        .summary-card.pending { border-left-color: #ffc107; }
        .summary-card.installments { border-left-color: #17a2b8; }

        .summary-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: white;
        }

        .summary-card.expected .summary-icon { background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%); }
        .summary-card.paid .summary-icon { background: linear-gradient(135deg, #28a745 0%, #218838 100%); }
        .summary-card.pending .summary-icon { background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); }
        .summary-card.installments .summary-icon { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); }

        .summary-content h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a4b6d;
        }

        .summary-content p {
          margin: 0;
          color: #6c757d;
          font-size: 0.875rem;
        }

        .filters-section {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .filter-toggle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .filter-toggle-btn {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-toggle-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(26, 75, 109, 0.3);
        }

        .date-filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          align-items: end;
        }

        .date-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .date-label {
          font-weight: 600;
          color: #1a4b6d;
          font-size: 0.875rem;
        }

        .date-input {
          padding: 0.75rem;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .date-input:focus {
          border-color: #1a4b6d;
          outline: none;
        }

        .filter-actions {
          display: flex;
          gap: 0.5rem;
        }

        .apply-btn {
          background: linear-gradient(135deg, #28a745 0%, #218838 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .apply-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        }

        .clear-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .clear-btn:hover {
          background: #5a6268;
        }

        .installments-section {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .installments-header {
          padding: 1.5rem 2rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #e9ecef;
        }

        .installments-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a4b6d;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .installments-table {
          width: 100%;
          border-collapse: collapse;
        }

        .installments-table th {
          padding: 1rem 2rem;
          text-align: left;
          font-weight: 600;
          color: #1a4b6d;
          border-bottom: 2px solid #e9ecef;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .installments-table td {
          padding: 1rem 2rem;
          border-bottom: 1px solid #f1f3f4;
          vertical-align: middle;
        }

        .installment-name {
          font-weight: 600;
          color: #1a4b6d;
        }

        .installment-amount {
          font-weight: 700;
          color: #28a745;
          font-size: 1.1rem;
        }

        .status-badge {
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-paid {
          background: linear-gradient(135deg, #28a745 0%, #218838 100%);
          color: white;
        }

        .status-pending {
          background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
          color: white;
        }

        .status-failed {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: white;
        }

        .installment-date {
          color: #6c757d;
          font-size: 0.875rem;
        }

        .no-installments {
          text-align: center;
          padding: 3rem 2rem;
          color: #6c757d;
        }

        .no-installments-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        @media (max-width: 768px) {
          .report-header {
            flex-direction: column;
            text-align: center;
            gap: 1.5rem;
          }

          .student-info {
            flex-direction: column;
            gap: 1rem;
          }

          .student-meta {
            justify-content: center;
            flex-wrap: wrap;
          }

          .summary-cards {
            grid-template-columns: 1fr;
          }

          .date-filters {
            grid-template-columns: 1fr;
          }

          .filter-actions {
            justify-content: center;
          }

          .installments-table {
            font-size: 0.875rem;
          }

          .installments-table th,
          .installments-table td {
            padding: 0.75rem 1rem;
          }
        }
      `}</style>

      <Breadcrumb
        items={[
          { label: "Dashboard", path: user?.role === "ACCOUNTANT" ? "/dashboard/accountant" : "/dashboard" },
          { label: "Payment Reports", path: "/college-admin/reports/payment-summary" },
          { label: "Student Report" },
        ]}
      />

      {/* HEADER */}
      <div className="report-header">
        <div className="student-info">
          <div className="student-avatar">
            <FaUser />
          </div>
          <div className="student-details">
            <h1>{studentData?.student?.fullName || "Student"}</h1>
            <div className="student-meta">
              <div className="student-meta-item">
                <FaFileInvoiceDollar />
                {studentData?.course?.name || "N/A"}
              </div>
              <div className="student-meta-item">
                <FaRupeeSign />
                Total Fee: ₹{totals.totalExpected?.toLocaleString() || "0"}
              </div>
            </div>
          </div>
        </div>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft />
          Back to Reports
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="summary-cards">
        <div className="summary-card expected">
          <div className="summary-icon">
            <FaFileInvoiceDollar />
          </div>
          <div className="summary-content">
            <h3>₹{totals.totalExpected?.toLocaleString() || "0"}</h3>
            <p>Total Expected Fee</p>
          </div>
        </div>

        <div className="summary-card paid">
          <div className="summary-icon">
            <FaRupeeSign />
          </div>
          <div className="summary-content">
            <h3>₹{totals.totalPaid?.toLocaleString() || "0"}</h3>
            <p>Total Paid</p>
          </div>
        </div>

        <div className="summary-card pending">
          <div className="summary-icon">
            <FaCalendarAlt />
          </div>
          <div className="summary-content">
            <h3>₹{totals.pending?.toLocaleString() || "0"}</h3>
            <p>Pending Amount</p>
          </div>
        </div>

        <div className="summary-card installments">
          <div className="summary-icon">
            <FaFileInvoiceDollar />
          </div>
          <div className="summary-content">
            <h3>{totals.paidCount}/{totals.totalCount}</h3>
            <p>Paid Installments</p>
          </div>
        </div>
      </div>

      {/* FILTERS SECTION */}
      <div className="filters-section">
        <div className="filter-toggle">
          <h3 style={{ margin: 0, color: '#1a4b6d' }}>Payment History Filters</h3>
          <button
            className="filter-toggle-btn"
            onClick={() => setShowDateFilters(!showDateFilters)}
          >
            <FaFilter />
            {showDateFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showDateFilters && (
          <div className="date-filters animate-fade-in">
            <div className="date-group">
              <label className="date-label">Start Date:</label>
              <input
                type="date"
                className="date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="date-group">
              <label className="date-label">End Date:</label>
              <input
                type="date"
                className="date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="filter-actions">
              <button className="apply-btn" onClick={fetchStudentPaymentData}>
                <FaSyncAlt /> Apply Filters
              </button>
              <button
                className="clear-btn"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  fetchStudentPaymentData();
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* INSTALLMENTS TABLE */}
      <div className="installments-section">
        <div className="installments-header">
          <h2 className="installments-title">
            <FaFileInvoiceDollar />
            Payment Installments
          </h2>
        </div>

        {paymentHistory.length > 0 ? (
          <table className="installments-table">
            <thead>
              <tr>
                <th>Installment</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment Date</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((installment, index) => (
                <tr key={index}>
                  <td>
                    <div className="installment-name">
                      {installment.name || `Installment ${index + 1}`}
                    </div>
                  </td>
                  <td>
                    <div className="installment-amount">
                      ₹{installment.amount?.toLocaleString() || "0"}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${installment.status?.toLowerCase() || 'pending'}`}>
                      {installment.status || "PENDING"}
                    </span>
                  </td>
                  <td>
                    <div className="installment-date">
                      {installment.paidAt
                        ? new Date(installment.paidAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : "Not paid"
                      }
                    </div>
                  </td>
                  <td>
                    <div className="installment-date">
                      {installment.dueDate
                        ? new Date(installment.dueDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : "N/A"
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-installments">
            <FaFileInvoiceDollar className="no-installments-icon" />
            <h4>No Payment Installments Found</h4>
            <p>This student doesn't have any payment installments in the selected date range.</p>
          </div>
        )}
      </div>
    </div>
  );
}