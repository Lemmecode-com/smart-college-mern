import {
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ConfirmModal from "../../../components/ConfirmModal";
import ApiError from "../../../components/ApiError";

import {
  FaUniversity,
  FaCheckCircle,
  FaTimesCircle,
  FaEnvelope,
  FaPhone,
  FaSearch,
  FaEye,
  FaToggleOff,
  FaToggleOn,
  FaSyncAlt,
  FaInfoCircle,
  FaDownload,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaChevronRight,
  FaPlus,
  FaListOl,
  FaFileExcel,
  FaFilePdf,
  FaChevronLeft,
} from "react-icons/fa";

const ITEMS_PER_PAGE = 10;

export default function CollegeList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [colleges, setColleges] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toggleData, setToggleData] = useState({
    id: null,
    currentStatus: null,
  });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Debounce search
  const searchTimeoutRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const hasLoadedRef = useRef(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "SUPER_ADMIN")
    return <Navigate to="/super-admin/dashboard" />;

  /* ================= FETCH COLLEGES ================= */
  const fetchColleges = async (forceRefresh = false) => {
    // Prevent duplicate fetches in Strict Mode (unless force refresh)
    if (!forceRefresh && hasLoadedRef.current) return;

    try {
      setLoading(true);
      setError("");
      // Fetch all colleges including inactive ones for Super Admin
      const res = await api.get("/master/get/colleges?includeInactive=true");

      const collegesData = res.data.colleges || res.data || [];
      setColleges(Array.isArray(collegesData) ? collegesData : []);
      setRetryCount(0);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    } catch (err) {
      // Only show error if not already loaded
      if (!hasLoadedRef.current) {
        const errorMsg =
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          "Failed to load colleges. Please try again.";
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  /* ================= DEBOUNCED SEARCH ================= */
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  /* ================= CLEANUP ================= */
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      // Reset hasLoaded flag on unmount for next navigation
      hasLoadedRef.current = false;
    };
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount((prev) => prev + 1);
      fetchColleges();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  };

  /* ================= REFRESH HANDLER ================= */
  const handleRefresh = () => {
    // Reset the loaded flag to allow re-fetching
    hasLoadedRef.current = false;
    fetchColleges(true); // Force refresh
  };

  /* ================= FILTER + PAGINATION ================= */
  const filteredColleges = useMemo(() => {
    return colleges
      .filter(
        (college) =>
          college.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          college.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          college.contactNumber.includes(debouncedSearch),
      )
      .filter((college) =>
        filterStatus === "ALL"
          ? true
          : filterStatus === "ACTIVE"
            ? college.isActive
            : !college.isActive,
      );
  }, [colleges, debouncedSearch, filterStatus]);

  const totalPages = Math.ceil(filteredColleges.length / ITEMS_PER_PAGE);
  const paginatedColleges = filteredColleges.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  /* ================= TOGGLE STATUS ================= */
  const handleToggleClick = (id, currentStatus) => {
    setToggleData({ id, currentStatus });
    setShowConfirmModal(true);
  };

  const handleConfirmToggle = async () => {
    const { id, currentStatus } = toggleData;
    const action = currentStatus ? "deactivate" : "activate";

    try {
      if (currentStatus) {
        // College is ACTIVE - Deactivate it
        await api.delete(`/master/${id}`);
      } else {
        // College is INACTIVE - Activate it
        await api.patch(`/master/${id}/restore`);
      }

      setColleges((prev) =>
        prev.map((c) => (c._id === id ? { ...c, isActive: !c.isActive } : c)),
      );
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || `Failed to ${action} college`;
      setError(errorMsg);
    }
    setShowConfirmModal(false);
    setToggleData({ id: null, currentStatus: null });
  };

  /* ================= EXPORT FUNCTIONALITY ================= */
  const handleExport = useCallback(
    async (format) => {
      setExporting(true);
      setShowExportMenu(false);

      try {
        // Prepare data for export
        const exportData = filteredColleges.map((college) => ({
          "College Name": college.name,
          Email: college.email,
          Contact: college.contactNumber,
          Established: college.establishedYear,
          Status: college.isActive ? "Active" : "Inactive",
          Created: new Date(college.createdAt).toLocaleDateString(),
        }));

        if (format === "excel") {
          // Excel export logic (you can integrate with ExcelJS)
          console.log("Excel export coming soon!");
        } else if (format === "pdf") {
          // PDF export logic (you can integrate with jsPDF)
          console.log("PDF export coming soon!");
        }
      } catch (err) {
        console.error("Export failed. Please try again.");
      } finally {
        setExporting(false);
      }
    },
    [filteredColleges],
  );

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <ApiError
        title="Colleges Loading Error"
        message={error}
        onRetry={handleRetry}
        onGoBack={() => navigate("/super-admin/dashboard")}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={loading}
      />
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading colleges..." />;
  }

  return (
    <div className="erp-container">
      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmToggle}
        title="Confirm Action"
        message={`Are you sure you want to ${toggleData.currentStatus ? "deactivate" : "activate"} this college? All associated users will ${toggleData.currentStatus ? "lose" : "regain"} access.`}
        type="warning"
        confirmText={toggleData.currentStatus ? "Deactivate" : "Activate"}
        cancelText="Cancel"
      />

      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/super-admin/dashboard" },
          { label: "Colleges Management" },
        ]}
      />

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaUniversity />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Colleges Management</h1>
            <p className="erp-page-subtitle">
              View and manage all registered educational institutions
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <div className="export-dropdown">
            <button
              className="erp-btn erp-btn-secondary"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting || filteredColleges.length === 0}
              aria-label="Export options"
            >
              <FaDownload className="erp-btn-icon" />
              <span>Export</span>
              <FaChevronDown className="erp-btn-arrow" />
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button
                  className="export-option"
                  onClick={() => handleExport("excel")}
                  disabled={exporting}
                >
                  <FaFileExcel className="export-icon excel" />
                  <span>Excel Spreadsheet</span>
                </button>
                <button
                  className="export-option"
                  onClick={() => handleExport("pdf")}
                  disabled={exporting}
                >
                  <FaFilePdf className="export-icon pdf" />
                  <span>PDF Document</span>
                </button>
              </div>
            )}
          </div>
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => navigate("/super-admin/create-college")}
          >
            <FaPlus className="erp-btn-icon" />
            <span>Add New College</span>
          </button>
        </div>
      </div>

      {/* INFO BANNER */}
      <div className="info-banner">
        <div className="info-icon">
          <FaInfoCircle />
        </div>
        <div className="info-content">
          <strong>Tip:</strong> Use search to find colleges quickly. Toggle
          status to enable/disable college access.
        </div>
      </div>

      {/* CONTROLS SECTION */}
      <div className="erp-card">
        <div className="erp-card-body">
          <div className="controls-container">
            <div className="search-group">
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name, email, or contact..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search colleges"
                />
                {search && (
                  <button
                    className="search-clear"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <FaTimesCircle />
                  </button>
                )}
              </div>

              <div className="filter-dropdown">
                <button className="filter-btn" aria-label="Open status filter">
                  <FaFilter className="filter-icon" />
                  <span>
                    {filterStatus === "ALL" ? "All Statuses" : filterStatus}
                  </span>
                  <FaChevronDown className="filter-arrow" />
                </button>
                <div className="filter-menu">
                  {["ALL", "ACTIVE", "INACTIVE"].map((status) => (
                    <button
                      key={status}
                      className={`filter-option ${filterStatus === status ? "active" : ""}`}
                      onClick={() => {
                        setFilterStatus(status);
                        setCurrentPage(1);
                      }}
                    >
                      {status === "ALL" ? "All Statuses" : status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="actions-group">
              <button
                className="refresh-btn"
                onClick={handleRefresh}
                title="Refresh college list"
                aria-label="Refresh colleges"
              >
                <FaSyncAlt className="refresh-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* COLLEGES TABLE */}
      <div className="erp-card">
        <div className="erp-card-header">
          <h3>
            <FaListOl className="erp-card-icon" />
            Colleges List
          </h3>
          <span className="record-count">
            {filteredColleges.length}{" "}
            {filteredColleges.length === 1 ? "College" : "Colleges"}
          </span>
        </div>

        <div className="erp-card-body">
          {paginatedColleges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaUniversity />
              </div>
              <h3>No Colleges Found</h3>
              <p className="empty-description">
                {search || filterStatus !== "ALL"
                  ? "No colleges match your search criteria. Try adjusting your filters."
                  : "There are no colleges registered yet. Create your first college to get started."}
              </p>
              {!search && filterStatus === "ALL" && (
                <button
                  className="erp-btn erp-btn-primary empty-action"
                  onClick={() => navigate("/super-admin/create-college")}
                >
                  <FaPlus className="erp-btn-icon" />
                  Add First College
                </button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>College</th>
                    <th>
                      <FaEnvelope className="header-icon" /> Email
                    </th>
                    <th>
                      <FaPhone className="header-icon" /> Contact
                    </th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedColleges.map((college) => (
                    <tr key={college._id}>
                      <td>
                        <div className="college-name">
                          <div className="college-avatar">
                            {college.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="college-details">
                            <div className="college-title">{college.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <FaEnvelope className="contact-icon" />
                          <span>{college.email}</span>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <FaPhone className="contact-icon" />
                          <span>{college.contactNumber}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-badge status-${college.isActive ? "active" : "inactive"}`}
                        >
                          {college.isActive ? (
                            <>
                              <FaCheckCircle className="status-icon" />
                              Active
                            </>
                          ) : (
                            <>
                              <FaTimesCircle className="status-icon" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="action-cell">
                        <div className="action-buttons">
                          <button
                            className="action-btn view-btn"
                            title="View College Details"
                            onClick={() =>
                              navigate(`/super-admin/college/${college._id}`)
                            }
                            aria-label={`View details for ${college.name}`}
                          >
                            <FaEye />
                          </button>
                          <button
                            className="action-btn toggle-btn"
                            title={
                              college.isActive
                                ? "Deactivate College"
                                : "Activate College"
                            }
                            onClick={() =>
                              handleToggleClick(college._id, college.isActive)
                            }
                            aria-label={
                              college.isActive
                                ? `Deactivate ${college.name}`
                                : `Activate ${college.name}`
                            }
                          >
                            {college.isActive ? (
                              <FaToggleOff className="toggle-icon" />
                            ) : (
                              <FaToggleOn className="toggle-icon" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="erp-pagination">
              <button
                className="page-btn prev-btn"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <FaChevronLeft />
              </button>

              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (num) => (
                    <button
                      key={num}
                      className={`page-btn ${currentPage === num ? "active" : ""}`}
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
                className="page-btn next-btn"
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

      {/* STYLES */}
      <style>{`
        /* ================= CONTAINER ================= */
        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
        }

        /* ================= PAGE HEADER ================= */
        .erp-page-header {
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(15, 58, 74, 0.3);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .erp-header-icon {
          width: 56px;
          height: 56px;
          background: rgba(61, 181, 230, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          color: #3db5e6;
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
          gap: 1rem;
          align-items: center;
        }

        .erp-header-actions .erp-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .erp-header-actions .erp-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        }

        .erp-header-actions .erp-btn-primary {
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          border: none;
        }

        .erp-header-actions .erp-btn-primary:hover {
          background: linear-gradient(135deg, #4fc3f7 0%, #1a4b6d 100%);
        }

        .erp-btn-arrow {
          font-size: 0.75rem;
          margin-left: 0.25rem;
          transition: transform 0.3s ease;
        }

        /* ================= EXPORT DROPDOWN ================= */
        .export-dropdown {
          position: relative;
        }

        .export-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          padding: 0.5rem;
          min-width: 200px;
          z-index: 1000;
          border: 1px solid #e9ecef;
        }

        .export-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border: none;
          background: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          color: #2c3e50;
        }

        .export-option:hover:not(:disabled) {
          background: #f0f8ff;
        }

        .export-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .export-icon {
          font-size: 1.1rem;
        }

        .export-icon.excel {
          color: #1d6f42;
        }

        .export-icon.pdf {
          color: #f40f02;
        }
        
        /* INFO BANNER */
        .info-banner {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          border-left: 4px solid #2196F3;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15);
        }
        
        .info-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(33, 150, 243, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2196F3;
          flex-shrink: 0;
        }
        
        .info-content {
          flex: 1;
          font-size: 0.95rem;
          color: #0d47a1;
          line-height: 1.5;
        }
        
        .info-content strong {
          font-weight: 600;
        }
        
        /* ================= CARD COMPONENT ================= */
        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
          overflow: hidden;
        }

        .erp-card-header {
          padding: 1.5rem 1.75rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .erp-card-header h3 {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
          color: #0f3a4a;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .erp-card-icon {
          color: #0f3a4a;
          font-size: 1.25rem;
        }

        .record-count {
          background: rgba(15, 58, 74, 0.1);
          color: #0f3a4a;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }
        
        .erp-card-body {
          padding: 0;
        }
        
        .controls-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.75rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .search-group {
          display: flex;
          gap: 1rem;
          flex: 1;
          min-width: 300px;
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
          font-size: 1rem;
        }
        
        .search-box input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 0.95rem;
        }
        
        .search-box input:focus {
          border-color: #0f3a4a;
          box-shadow: 0 0 0 0.2rem rgba(15, 58, 74, 0.15);
          outline: none;
        }

        .search-clear {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          font-size: 1rem;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .search-clear:hover {
          color: #dc3545;
        }
        
        .filter-dropdown {
          position: relative;
        }
        
        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-weight: 500;
          color: #2c3e50;
          cursor: pointer;
        }
        
        .filter-btn:hover {
          border-color: #0f3a4a;
          background: #f8f9fa;
        }
        
        .filter-icon {
          font-size: 1rem;
        }
        
        .filter-arrow {
          font-size: 0.75rem;
          transition: transform 0.3s ease;
        }
        
        .filter-btn:hover .filter-arrow {
          transform: rotate(180deg);
        }
        
        .filter-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 0.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          padding: 0.5rem;
          width: 180px;
          z-index: 1000;
          display: none;
        }
        
        .filter-dropdown:hover .filter-menu {
          display: block;
        }
        
        .filter-option {
          width: 100%;
          padding: 0.5rem 1rem;
          border: none;
          background: none;
          text-align: left;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        
        .filter-option:hover {
          background: #f0f5ff;
        }
        
        .filter-option.active {
          background: #e3f2fd;
          color: #1976d2;
          font-weight: 600;
        }
        
        .actions-group {
          display: flex;
          gap: 0.75rem;
        }
        
        .export-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: linear-gradient(135deg, #43a047 0%, #2e7d32 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(67, 160, 71, 0.3);
        }
        
        .export-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(67, 160, 71, 0.4);
        }
        
        .export-icon {
          font-size: 1.1rem;
        }
        
        .refresh-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: white;
          border: 2px solid #e9ecef;
          color: #1a4b6d;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .refresh-btn:hover {
          border-color: #0f3a4a;
          background: #f8f9fa;
          transform: rotate(90deg);
        }
        
        .refresh-icon {
          font-size: 1.2rem;
        }
        
        /* TABLE */
        .table-container {
          overflow-x: auto;
          border-radius: 0 0 16px 16px;
        }
        
        .erp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }
        
        .erp-table thead {
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          color: white;
        }
        
        .erp-table th {
          padding: 1rem 1.25rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.95rem;
          white-space: nowrap;
        }
        
        .header-icon {
          margin-right: 0.5rem;
          font-size: 0.9rem;
        }
        
        .erp-table tbody tr {
          border-bottom: 1px solid #f0f2f5;
        }
        
        .erp-table tbody tr:hover {
          background: #f8f9ff;
        }
        
        .erp-table td {
          padding: 1rem 1.25rem;
          color: #2c3e50;
          font-weight: 500;
          vertical-align: middle;
        }
        
        .college-name {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .college-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .college-details {
          flex: 1;
        }

        .college-title {
          font-weight: 700;
          color: #0f172a;
          font-size: 0.95rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.2;
        }
        
        .contact-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #0f3a4a;
          font-size: 0.875rem;
        }

        .contact-icon {
          color: #6c757d;
          font-size: 0.9rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        
        .status-badge.status-active {
          background: rgba(76, 175, 80, 0.15);
          color: #4CAF50;
        }
        
        .status-badge.status-inactive {
          background: rgba(244, 67, 54, 0.15);
          color: #F44336;
        }
        
        .status-icon {
          font-size: 0.8rem;
        }
        
        .action-cell {
          text-align: center;
          min-width: 150px;
        }
        
        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .action-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          color: white;
          font-size: 0.9rem;
          position: relative;
          overflow: hidden;
        }
        
        .action-btn::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.3s, height 0.3s;
        }
        
        .action-btn:hover::before {
          width: 200%;
          height: 200%;
        }
        
        .view-btn {
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
        }
        
        .toggle-btn {
          background: linear-gradient(135deg, #4CAF50 0%, #43A047 100%);
        }
        
        .toggle-icon {
          font-size: 1.2rem;
        }
        
        .action-btn:hover {
          transform: translateY(-2px) scale(1.1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.25);
        }
        
        /* PAGINATION */
        .erp-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          border-top: 1px solid #e9ecef;
          gap: 0.5rem;
        }
        
        .page-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: none;
          background: #f8f9fa;
          color: #1a4b6d;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .page-btn:hover:not(:disabled) {
          background: #e9ecef;
          transform: translateY(-1px);
        }
        
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .page-btn.active {
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          color: white;
        }
        
        .page-numbers {
          display: flex;
          gap: 0.25rem;
        }
        
        /* EMPTY STATE */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #666;
        }
        
        .empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.1) 0%, rgba(12, 45, 58, 0.1) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f3a4a;
          font-size: 2.5rem;
        }
        
        .empty-state h3 {
          font-size: 1.75rem;
          color: #2c3e50;
          margin-bottom: 0.75rem;
        }
        
        .empty-description {
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          color: #6c757d;
        }
        
        .empty-action {
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          border: none;
          padding: 0.875rem 2rem;
          font-size: 1.05rem;
          font-weight: 600;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(15, 58, 74, 0.4);
        }

        .empty-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(15, 58, 74, 0.5);
        }
        
        /* MODAL STYLES */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
        }
        
        .modal-header {
          padding: 1.5rem 2rem;
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .modal-icon {
          font-size: 1.75rem;
        }

        .modal-title h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .modal-close {
          background: none;
          border: none;
          color: white;
          font-size: 2.5rem;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        
        .modal-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .modal-body {
          padding: 2rem;
          overflow-y: auto;
        }
        
        .modal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        
        .modal-section {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 1.5rem;
        }
        
        .modal-section h4 {
          margin: 0 0 1rem 0;
          font-size: 1.15rem;
          color: #1a4b6d;
        }
        
        .modal-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .detail-row {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .detail-label {
          font-size: 0.85rem;
          color: #6c757d;
        }
        
        .detail-value {
          font-weight: 600;
          color: #1a4b6d;
          word-break: break-word;
        }
        
        .detail-value.email {
          color: #0f3a4a;
          text-decoration: underline;
          cursor: pointer;
        }
        
        .detail-value.multiline {
          white-space: pre-line;
          line-height: 1.5;
        }
        
        .detail-value.status {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .detail-value.status.active {
          background: rgba(76, 175, 80, 0.15);
          color: #4CAF50;
        }
        
        .detail-value.status.inactive {
          background: rgba(244, 67, 54, 0.15);
          color: #F44336;
        }
        
        .modal-footer {
          padding: 1.5rem 2rem;
          border-top: 1px solid #e9ecef;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          background: #f8f9fa;
        }

        /* LOADING CONTAINER */
        .erp-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 2rem;
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
          border-top-color: #0f3a4a;
          animation: spin 1s linear infinite;
        }

        .spinner-ring:nth-child(2) {
          border-top-color: #0c2d3a;
          animation-delay: 0.1s;
        }

        .spinner-ring:nth-child(3) {
          border-top-color: rgba(15, 58, 74, 0.5);
          animation-delay: 0.2s;
        }
        
        .erp-loading-text {
          font-size: 1.35rem;
          font-weight: 600;
          color: #0f3a4a;
        }
        
        .skeleton-table {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          margin-top: 1.5rem;
          width: 100%;
        }
        
        .skeleton-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          border-bottom: 1px solid #f0f2f5;
          padding: 1rem 1.25rem;
        }
        
        .skeleton-cell {
          height: 24px;
          background: #f0f2f5;
          border-radius: 6px;
          position: relative;
          overflow: hidden;
        }
        
        .skeleton-cell::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: skeleton-loading 1.5s infinite;
        }
        
        /* ANIMATIONS */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes skeleton-loading {
          to { left: 100%; }
        }
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 992px) {
          .controls-container {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-group {
            width: 100%;
          }
          
          .erp-table {
            min-width: 650px;
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
            margin-top: 0.5rem;
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
          
          .erp-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          
          .record-count {
            align-self: flex-end;
          }
          
          .erp-table {
            min-width: 600px;
          }
          
          .action-buttons {
            flex-direction: column;
            align-items: center;
          }
          
          .action-btn {
            width: 100%;
            margin-bottom: 0.5rem;
          }
          
          .page-numbers {
            flex-wrap: wrap;
          }
          
          .page-btn {
            width: 36px;
            height: 36px;
            font-size: 0.85rem;
          }
          
          .modal-content {
            width: 95%;
            max-width: 100%;
          }
          
          .modal-grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 480px) {
          .erp-table {
            min-width: 500px;
          }
          
          .erp-card-header h3 {
            font-size: 1.25rem;
          }
          
          .college-name {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
