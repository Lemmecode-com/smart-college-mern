import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import ExportButtons from "../../../components/ExportButtons";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";
import {
  FaUserTimes,
  FaSearch,
  FaFilter,
  FaReceipt,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaRupeeSign,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
  FaFileInvoiceDollar,
} from "react-icons/fa";

const PAGE_SIZE = 10;

export default function DefaulterList() {
   const navigate = useNavigate();
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [defaulters, setDefaulters] = useState([]);
   const [summary, setSummary] = useState(null);
   const [searchQuery, setSearchQuery] = useState("");
   const [escalationFilter, setEscalationFilter] = useState("");
   const [currentPage, setCurrentPage] = useState(1);

   const fetchDefaulters = useCallback(async () => {
     try {
       setLoading(true);
       setError(null);

       const params = new URLSearchParams();
       if (searchQuery) params.append("search", searchQuery);
       if (escalationFilter) params.append("escalationLevel", escalationFilter);

      const res = await api.get(`/admin/payments/defaulters?${params.toString()}`);
      setDefaulters(res.data?.defaulters || []);
      setSummary(res.data?.summary || null);

      toast.success("Defaulter list loaded successfully!", {
        position: "top-right",
        autoClose: 3000,
        toastId: "defaulter-success",
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to load defaulters list";
      setError({ message: errorMsg, statusCode: err.response?.status });
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        toastId: "defaulter-error",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, escalationFilter]);

  useEffect(() => {
    fetchDefaulters();
  }, [fetchDefaulters]);

  const filteredDefaulters = useMemo(() => {
    return defaulters.filter((d) => {
      if (escalationFilter && d.installment?.escalationLevel !== escalationFilter) {
        return false;
      }
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const nameMatch = (d.student?.name || "").toLowerCase().includes(searchLower);
        const emailMatch = (d.student?.email || "").toLowerCase().includes(searchLower);
        const enrollmentMatch = (d.student?.enrollmentNumber || "").toLowerCase().includes(searchLower);
        if (!nameMatch && !emailMatch && !enrollmentMatch) return false;
      }
      return true;
    });
  }, [defaulters, searchQuery, escalationFilter]);

  const totalPages = Math.ceil(filteredDefaulters.length / PAGE_SIZE);
  const paginatedDefaulters = filteredDefaulters.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, escalationFilter]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getEscalationBadgeClass = (level) => {
    const classes = {
      DUE_TODAY: "badge-due-today",
      SLIGHTLY_OVERDUE: "badge-slightly",
      MODERATELY_OVERDUE: "badge-moderately",
      SEVERELY_OVERDUE: "badge-severely",
      CRITICALLY_OVERDUE: "badge-critically",
    };
    return classes[level] || "badge-default";
  };

  const getEscalationLabel = (level) => {
    const labels = {
      DUE_TODAY: "Due Today",
      SLIGHTLY_OVERDUE: "1-7 days overdue",
      MODERATELY_OVERDUE: "8-15 days overdue",
      SEVERELY_OVERDUE: "16-30 days overdue",
      CRITICALLY_OVERDUE: "30+ days overdue",
    };
    return labels[level] || level;
  };

  const getExportData = () => {
    return filteredDefaulters.map((d) => ({
      "Student Name": d.student?.name || "N/A",
      "Email": d.student?.email || "N/A",
      "Enrollment": d.student?.enrollmentNumber || "N/A",
      "Course": d.course?.name || "N/A",
      "Installment": d.installment?.name || "N/A",
      "Amount": formatCurrency(d.installment?.amount),
      "Due Date": d.installment?.dueDate ? new Date(d.installment.dueDate).toLocaleDateString() : "N/A",
      "Days Overdue": d.installment?.daysOverdue || 0,
      "Escalation Level": getEscalationLabel(d.installment?.escalationLevel),
    }));
  };

  const exportColumns = [
    { header: "Student Name", key: "Student Name" },
    { header: "Email", key: "Email" },
    { header: "Enrollment", key: "Enrollment" },
    { header: "Course", key: "Course" },
    { header: "Installment", key: "Installment" },
    { header: "Amount", key: "Amount" },
    { header: "Due Date", key: "Due Date" },
    { header: "Days Overdue", key: "Days Overdue" },
    { header: "Escalation Level", key: "Escalation Level" },
  ];

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading defaulters list..." />;
  }

  if (error) {
    return (
      <ApiError
        title="Error Loading Defaulters"
        message={error.message}
        statusCode={error.statusCode}
        onRetry={fetchDefaulters}
        onGoBack={() => navigate("/dashboard/accountant")}
      />
    );
  }

  return (
    <div className="defaulter-list-container">
      <style>{`
        .defaulter-list-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .defaulter-header {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          color: white;
        }
        .defaulter-header h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .summary-card {
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          text-align: center;
        }
        .summary-value {
          font-size: 2rem;
          font-weight: 800;
          color: #dc3545;
        }
        .summary-label {
          font-size: 0.95rem;
          color: #666;
          font-weight: 600;
        }
        .controls-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
          padding: 1.25rem 1.75rem;
        }
        .search-box {
          position: relative;
          flex: 1;
          min-width: 280px;
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
        }
        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 0.95rem;
        }
        .search-input:focus {
          border-color: #dc3545;
          outline: none;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .badge-due-today { background: #ffc107; color: #212529; }
        .badge-slightly { background: #fd7e14; color: white; }
        .badge-moderately { background: #e83e8c; color: white; }
        .badge-severely { background: #c82333; color: white; }
        .badge-critically { background: #721c24; color: white; }
        .table-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }
        .defaulter-table {
          width: 100%;
          border-collapse: collapse;
        }
        .defaulter-table th {
          padding: 16px 20px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #212529;
          text-transform: uppercase;
          background: #f8f9fa;
        }
        .defaulter-table td {
          padding: 18px 20px;
          border-top: 1px solid #e9ecef;
        }
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          gap: 0.5rem;
        }
        .page-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: none;
          background: #f8f9fa;
          color: #dc3545;
          font-weight: 600;
          cursor: pointer;
        }
        .page-btn:hover:not(:disabled) {
          background: #e9ecef;
        }
        .page-btn.active {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: white;
        }
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #666;
        }
      `}</style>

      <Breadcrumb
        items={[
          { label: "Accountant Dashboard", path: "/dashboard/accountant" },
          { label: "Defaulter List" },
        ]}
      />

      <div className="defaulter-header">
        <h1>
          <FaUserTimes />
          Defaulter List
        </h1>
      </div>

      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-value">{summary.totalDefaulters}</div>
            <div className="summary-label">Total Defaulters</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{formatCurrency(summary.totalPendingAmount)}</div>
            <div className="summary-label">Total Pending Amount</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{summary.byEscalation.CRITICALLY_OVERDUE || 0}</div>
            <div className="summary-label">Critical Defaulters</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{summary.byEscalation.SEVERELY_OVERDUE || 0}</div>
            <div className="summary-label">Severe Defaulters</div>
          </div>
        </div>
      )}

      <div className="controls-card">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, or enrollment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <select
            value={escalationFilter}
            onChange={(e) => setEscalationFilter(e.target.value)}
            className="form-select"
            style={{ width: "200px" }}
          >
            <option value="">All Escalation Levels</option>
            <option value="DUE_TODAY">Due Today</option>
            <option value="SLIGHTLY_OVERDUE">Slightly Overdue</option>
            <option value="MODERATELY_OVERDUE">Moderately Overdue</option>
            <option value="SEVERELY_OVERDUE">Severely Overdue</option>
            <option value="CRITICALLY_OVERDUE">Critically Overdue</option>
          </select>

          <ExportButtons
            title="Defaulter List"
            columns={exportColumns}
            data={getExportData()}
            filename={`defaulters_${new Date().toISOString().split("T")[0]}`}
            showCSV
            showPDF
          />
        </div>
      </div>

      <div className="table-card">
        <div className="p-4 border-bottom">
          <h5 className="mb-0">
            <FaFileInvoiceDollar className="me-2" />
            Defaulters ({filteredDefaulters.length})
          </h5>
        </div>

        {paginatedDefaulters.length === 0 ? (
          <div className="empty-state">
            <FaUserTimes style={{ fontSize: "3rem", color: "#cbd5e1", marginBottom: "1rem" }} />
            <h4>No Defaulters Found</h4>
            <p>Students with overdue payments will appear here.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="defaulter-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Installment</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Days Overdue</th>
                    <th>Escalation</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDefaulters.map((d, idx) => (
                    <tr key={idx}>
                      <td>
                        <div>
                          <strong>{d.student?.name}</strong>
                          <br />
                          <small>{d.student?.email}</small>
                          <br />
                          <small>{d.student?.enrollmentNumber}</small>
                        </div>
                      </td>
                      <td>{d.course?.name}</td>
                      <td>{d.installment?.name}</td>
                      <td>{formatCurrency(d.installment?.amount)}</td>
                      <td>
                        {d.installment?.dueDate 
                          ? new Date(d.installment.dueDate).toLocaleDateString() 
                          : "N/A"}
                      </td>
                      <td>{d.installment?.daysOverdue || 0}</td>
                      <td>
                        <span className={`badge ${getEscalationBadgeClass(d.installment?.escalationLevel)}`}>
                          {getEscalationLabel(d.installment?.escalationLevel)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <FaChevronLeft />
                </button>

                <div className="d-flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      className={`page-btn ${currentPage === num ? "active" : ""}`}
                      onClick={() => setCurrentPage(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  className="page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}