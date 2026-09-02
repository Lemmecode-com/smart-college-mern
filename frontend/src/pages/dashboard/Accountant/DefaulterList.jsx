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
import "./DefaulterList.css";

const PAGE_SIZE = 10;
const PAGE_LOAD_TOAST_ID = "accountant-defaulter-list-load";

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
        toastId: PAGE_LOAD_TOAST_ID,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to load defaulters list";
      setError({ message: errorMsg, statusCode: err.response?.status, errorCode: err.response?.data?.code });
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
    return () => {
      toast.dismiss(PAGE_LOAD_TOAST_ID);
    };
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
      DUE_TODAY: "due-today",
      SLIGHTLY_OVERDUE: "slightly",
      MODERATELY_OVERDUE: "moderately",
      SEVERELY_OVERDUE: "severely",
      CRITICALLY_OVERDUE: "critically",
    };
    return classes[level] || "";
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
    { header: "Student Name", key: "Student Name", width: 14, align: "left" },
    { header: "Email", key: "Email", width: 16, align: "left" },
    { header: "Enrollment", key: "Enrollment", width: 14, align: "left" },
    { header: "Course", key: "Course", width: 14, align: "left" },
    { header: "Installment", key: "Installment", width: 14, align: "left" },
    { header: "Amount", key: "Amount", width: 12, align: "right" },
    { header: "Due Date", key: "Due Date", width: 12, align: "center" },
    { header: "Days Overdue", key: "Days Overdue", width: 10, align: "center" },
    { header: "Escalation Level", key: "Escalation Level", width: 14, align: "center" },
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
        errorCode={error.errorCode}
        onRetry={fetchDefaulters}
        onGoBack={() => navigate("/dashboard/accountant")}
      />
    );
  }

   return (
     <div className="defaulter-list erp-page erp-viewport-min-100">
       <Breadcrumb
         items={[
           { label: "Accountant Dashboard", path: "/dashboard/accountant" },
           { label: "Defaulter List" },
         ]}
       />

       <div className="dashboard-header">
         <h1>
           <FaUserTimes />
           Defaulter List
         </h1>
       </div>

       {summary && (
         <div className="summary-grid">
           <div className="stat-card total">
             <div className="stat-icon">
               <FaUserTimes />
             </div>
             <div className="stat-content">
               <div className="stat-label">Total Defaulters</div>
               <div className="stat-value">{summary.totalDefaulters}</div>
             </div>
           </div>
           <div className="stat-card amount">
             <div className="stat-icon">
               <FaRupeeSign />
             </div>
             <div className="stat-content">
               <div className="stat-label">Total Pending Amount</div>
               <div className="stat-value">{formatCurrency(summary.totalPendingAmount)}</div>
             </div>
           </div>
           <div className="stat-card critical">
             <div className="stat-icon">
               <FaExclamationTriangle />
             </div>
             <div className="stat-content">
               <div className="stat-label">Critical Defaulters</div>
               <div className="stat-value">{summary.byEscalation.CRITICALLY_OVERDUE || 0}</div>
             </div>
           </div>
           <div className="stat-card severe">
             <div className="stat-icon">
               <FaCalendarAlt />
             </div>
             <div className="stat-content">
               <div className="stat-label">Severe Defaulters</div>
               <div className="stat-value">{summary.byEscalation.SEVERELY_OVERDUE || 0}</div>
             </div>
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
             style={{ width: "100%", maxWidth: "200px" }}
           >
             <option value="">All Escalation Levels</option>
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
                        <span className={`escalation-badge ${getEscalationBadgeClass(d.installment?.escalationLevel)}`}>
                          {getEscalationLabel(d.installment?.escalationLevel)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="defaulter-pagination">
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