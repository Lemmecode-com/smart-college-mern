import { useContext, useEffect, useState, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaMoneyBillWave,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaFilter,
  FaSyncAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaArrowLeft,
  FaUniversity,
  FaLayerGroup,
  FaUsers,
  FaRupeeSign,
  FaListOl,
  FaCalendarAlt,
  FaInfoCircle,
  FaSpinner,
  FaDownload,
  FaChevronDown,
  FaChevronUp,
  FaBolt,
  FaStar,
  FaAward
} from "react-icons/fa";

export default function FeeStructureList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  const [stats, setStats] = useState({
    totalStructures: 0,
    totalFeeAmount: 0,
    categories: {},
    courses: {}
  });

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH ================= */
  const loadStructures = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/fees/structure");
      const data = res.data || [];
      setStructures(data);
      
      // Calculate stats client-side (no API changes)
      calculateStats(data);
      setRetryCount(0);
    } catch (err) {
      console.error("Fee structures fetch error:", err);
      setError(err.response?.data?.message || "Failed to load fee structures. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= CALCULATE STATS ================= */
  const calculateStats = (structureList) => {
    const categories = {};
    const courses = {};
    let totalFeeAmount = 0;
    
    structureList.forEach(structure => {
      // Category stats
      categories[structure.category] = (categories[structure.category] || 0) + 1;
      
      // Course stats
      const courseName = structure.course_id?.name || "Unknown";
      courses[courseName] = (courses[courseName] || 0) + 1;
      
      // Total fee amount
      totalFeeAmount += structure.totalFee || 0;
    });
    
    setStats({
      totalStructures: structureList.length,
      totalFeeAmount,
      categories,
      courses
    });
  };

  useEffect(() => {
    loadStructures();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      loadStructures();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  };

  /* ================= SORTING ================= */
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sorted = [...structures].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setStructures(sorted);
  };

  /* ================= FILTERING ================= */
  const filteredStructures = useMemo(() => {
    return structures.filter(structure => 
      (structure.course_id?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       structure.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       structure.totalFee?.toString().includes(searchTerm))
    );
  }, [structures, searchTerm]);

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this fee structure? This action cannot be undone."
    );
    if (!confirm) return;

    try {
      await api.delete(`/fees/structure/${id}`);
      loadStructures();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete fee structure. Please try again.");
      console.error("Delete error:", err);
    }
  };

  /* ================= LOADING SKELETON ================= */
  const renderSkeleton = () => (
    <div className="skeleton-container">
      <div className="skeleton-stats-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-stat-card">
            <div className="skeleton-stat-icon"></div>
            <div className="skeleton-stat-content">
              <div className="skeleton-stat-label"></div>
              <div className="skeleton-stat-value"></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-header-cell"></div>
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-table-row">
            <div className="skeleton-cell skeleton-text short"></div>
            <div className="skeleton-cell skeleton-text long"></div>
            <div className="skeleton-cell skeleton-text medium"></div>
            <div className="skeleton-cell skeleton-text medium"></div>
            <div className="skeleton-cell skeleton-text short"></div>
            <div className="skeleton-cell skeleton-actions">
              <div className="skeleton-action"></div>
              <div className="skeleton-action"></div>
              <div className="skeleton-action"></div>
            </div>
          </div>
        ))}
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
        <h3>Fee Structures Error</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button 
            className="erp-btn erp-btn-secondary" 
            onClick={() => navigate(-1)}
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
  if (loading) {
    return (
      <div className="erp-loading-container">
        <div className="erp-loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h4 className="erp-loading-text">Loading fee structures...</h4>
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
          <li className="breadcrumb-item active" aria-current="page">Fee Structures</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon blink-pulse">
            <FaMoneyBillWave />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Fee Structures Management</h1>
            <p className="erp-page-subtitle">
              Manage course-wise & category-based fee structures with flexible installments
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => navigate("/fees/create")}
          >
            <FaPlus className="erp-btn-icon pulse" />
            <span>Create New Structure</span>
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="stats-grid animate-fade-in">
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
            <FaListOl />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Total Structures</div>
            <div className="stat-card-value">{stats.totalStructures}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
            <FaRupeeSign />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Total Fee Amount</div>
            <div className="stat-card-value">₹{stats.totalFeeAmount.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
            <FaUsers />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Categories</div>
            <div className="stat-card-value">{Object.keys(stats.categories).length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'}}>
            <FaLayerGroup />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Courses Covered</div>
            <div className="stat-card-value">{Object.keys(stats.courses).length}</div>
          </div>
        </div>
      </div>

      {/* CONTROLS SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-body">
          <div className="controls-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by course, category, or fee amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search fee structures"
              />
            </div>

            <div className="actions-group">
              <button
                className="refresh-btn"
                onClick={loadStructures}
                title="Refresh data"
                aria-label="Refresh fee structures"
              >
                <FaSyncAlt className="refresh-icon spin" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FEE STRUCTURES TABLE */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaMoneyBillWave className="erp-card-icon" />
            Fee Structures List
          </h3>
          <span className="structure-count">
            {filteredStructures.length} {filteredStructures.length === 1 ? "Structure" : "Structures"}
          </span>
        </div>
        
        <div className="erp-card-body">
          {filteredStructures.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaMoneyBillWave />
              </div>
              <h3>No Fee Structures Found</h3>
              <p className="empty-description">
                {searchTerm 
                  ? "No fee structures match your search criteria. Try adjusting your filters."
                  : "There are no fee structures configured yet. Create your first structure to get started."}
              </p>
              {!searchTerm && (
                <button 
                  className="erp-btn erp-btn-primary empty-action"
                  onClick={() => navigate("/fees/create")}
                >
                  <FaPlus className="erp-btn-icon" />
                  Create First Fee Structure
                </button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th onClick={() => handleSort('course_id.name')}>
                      Course {sortConfig.key === 'course_id.name' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                    </th>
                    <th onClick={() => handleSort('category')}>
                      Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                    </th>
                    <th onClick={() => handleSort('totalFee')}>
                      Total Fee {sortConfig.key === 'totalFee' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                    </th>
                    <th onClick={() => handleSort('installments.length')}>
                      Installments {sortConfig.key === 'installments.length' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                    </th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStructures.map((structure, index) => (
                    <tr key={structure._id} className="table-row">
                      <td>{index + 1}</td>
                      <td>
                        <div className="course-info">
                          <div className="course-name">{structure.course_id?.name || "N/A"}</div>
                          {/* <div className="course-meta">
                            <span className="course-code">{structure.course_id?.code || "N/A"}</span>
                          </div> */}
                        </div>
                      </td>
                      <td>
                        <span className={`category-badge category-${structure.category?.toLowerCase() || 'general'}`}>
                          {structure.category || "N/A"}
                        </span>
                      </td>
                      <td>
                        <div className="fee-amount">
                          <FaRupeeSign className="rupee-icon" />
                          {structure.totalFee?.toLocaleString() || "0"}
                        </div>
                      </td>
                      <td>
                        <div className="installment-info">
                          <FaListOl className="installment-icon" />
                          {structure.installments?.length || 0}
                          <span className="installment-label">installments</span>
                        </div>
                      </td>
                      <td className="action-cell">
                        <div className="action-buttons">
                          <button
                            className="action-btn view-btn"
                            title="View Fee Structure Details"
                            onClick={() => navigate(`/fees/view/${structure._id}`)}
                            aria-label={`View details for ${structure.course_id?.name}`}
                          >
                            <FaEye className="action-icon pulse" />
                          </button>
                          <button
                            className="action-btn edit-btn"
                            title="Edit Fee Structure"
                            onClick={() => navigate(`/fees/edit/${structure._id}`)}
                            aria-label={`Edit ${structure.course_id?.name} fee structure`}
                          >
                            <FaEdit className="action-icon pulse" />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            title="Delete Fee Structure"
                            onClick={() => handleDelete(structure._id)}
                            aria-label={`Delete ${structure.course_id?.name} fee structure`}
                          >
                            <FaTrash className="action-icon shake" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
        
        .erp-header-actions .erp-btn {
          background: white;
          color: #1a4b6d;
          border: none;
          padding: 0.75rem 1.5rem;
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
        
        /* STATS GRID */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
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
        
        .stat-card-icon {
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
        
        .stat-card-content {
          flex: 1;
        }
        
        .stat-card-label {
          font-size: 0.95rem;
          color: #666;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .stat-card-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1a4b6d;
          line-height: 1;
        }
        
        /* CONTROLS CARD */
        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .erp-card:hover {
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
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
          color: #1a4b6d;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .erp-card-icon {
          color: #1a4b6d;
          font-size: 1.25rem;
        }
        
        .structure-count {
          background: rgba(26, 75, 109, 0.1);
          color: #1a4b6d;
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
        
        .search-box {
          position: relative;
          flex: 1;
          min-width: 300px;
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
          transition: all 0.3s ease;
        }
        
        .search-box input:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
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
          transition: all 0.3s ease;
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
          transition: all 0.3s ease;
        }
        
        .refresh-btn:hover {
          border-color: #1a4b6d;
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
          min-width: 800px;
        }
        
        .erp-table thead {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
        }
        
        .erp-table th {
          padding: 1rem 1.25rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          user-select: none;
          position: relative;
        }
        
        .erp-table th:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .erp-table th::after {
          content: "";
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
        }
        
        .erp-table tbody tr {
          border-bottom: 1px solid #f0f2f5;
          transition: all 0.2s ease;
        }
        
        .erp-table tbody tr:hover {
          background: #f8f9ff;
          transform: translateX(5px);
        }
        
        .erp-table td {
          padding: 1rem 1.25rem;
          color: #2c3e50;
          font-weight: 500;
          vertical-align: middle;
        }
        
        .course-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .course-name {
          font-weight: 600;
          color: #1a4b6d;
          font-size: 0.95rem;
        }
        
        .course-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        
        .course-code {
          font-size: 0.8rem;
          color: #6c757d;
          background: #f0f2f5;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
        }
        
        .category-badge {
          display: inline-block;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          background: rgba(33, 150, 243, 0.1);
          color: #1976d2;
        }
        
        .category-gen { background: rgba(76, 175, 80, 0.1); color: #4CAF50; }
        .category-obc { background: rgba(255, 152, 0, 0.1); color: #e68a00; }
        .category-sc { background: rgba(156, 39, 176, 0.1); color: #9c27b0; }
        .category-st { background: rgba(244, 67, 54, 0.1); color: #f44336; }
        .category-ews { background: rgba(33, 150, 243, 0.1); color: #2196f3; }
        
        .fee-amount {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: #1a4b6d;
          font-size: 1.1rem;
        }
        
        .rupee-icon {
          color: #F44336;
          font-size: 1.1rem;
          animation: float 3s ease-in-out infinite;
        }
        
        .installment-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #1a4b6d;
        }
        
        .installment-icon {
          color: #6c757d;
          font-size: 1rem;
        }
        
        .installment-label {
          font-size: 0.85rem;
          color: #6c757d;
        }
        
        .action-cell {
          text-align: center;
          min-width: 160px;
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
          transition: all 0.2s ease;
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
        
        .edit-btn {
          background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
        }
        
        .delete-btn {
          background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%);
        }
        
        .action-btn:hover {
          transform: translateY(-2px) scale(1.1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.25);
        }
        
        .action-icon {
          position: relative;
          z-index: 1;
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
          background: linear-gradient(135deg, rgba(26, 75, 109, 0.1) 0%, rgba(15, 58, 74, 0.1) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a4b6d;
          font-size: 2.5rem;
          animation: pulse 2s ease-in-out infinite;
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
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          border: none;
          padding: 0.875rem 2rem;
          font-size: 1.05rem;
          font-weight: 600;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(26, 75, 109, 0.4);
        }
        
        .empty-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.5);
        }
        
        /* SKELETON LOADING */
        .skeleton-container {
          padding: 1.5rem;
        }
        
        .skeleton-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .skeleton-stat-card {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        
        .skeleton-stat-icon {
          width: 52px;
          height: 52px;
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
          height: 28px;
          background: #e9ecef;
          border-radius: 4px;
          width: 40%;
        }
        
        .skeleton-table {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .skeleton-table-header {
          display: grid;
          grid-template-columns: 60px repeat(4, 1fr) 160px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        .skeleton-header-cell {
          height: 40px;
          background: #e9ecef;
        }
        
        .skeleton-table-row {
          display: grid;
          grid-template-columns: 60px repeat(4, 1fr) 160px;
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
        
        .skeleton-text.long { width: 80%; }
        .skeleton-text.medium { width: 60%; }
        .skeleton-text.short { width: 40%; }
        .skeleton-actions { display: flex; gap: 0.5rem; justify-content: center; }
        .skeleton-action { width: 36px; height: 36px; border-radius: 8px; }
        
        @keyframes skeleton-loading {
          to { left: 100%; }
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
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes progressPulse {
          0%, 100% { width: 35%; }
          50% { width: 65%; }
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
          .controls-container {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-box {
            min-width: auto;
          }
          
          .erp-table {
            min-width: 700px;
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
          
          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          }
          
          .stat-card-value {
            font-size: 1.75rem;
          }
          
          .erp-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          
          .structure-count {
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
          
          .empty-icon {
            width: 60px;
            height: 60px;
            font-size: 2rem;
          }
          
          .empty-state h3 {
            font-size: 1.5rem;
          }
          
          .skeleton-table-header,
          .skeleton-table-row {
            grid-template-columns: 60px 2fr 1fr 1fr 120px;
          }
        }
        
        @media (max-width: 480px) {
          .erp-table {
            min-width: 500px;
          }
          
          .erp-card-header h3 {
            font-size: 1.25rem;
          }
          
          .erp-card-header .erp-card-icon {
            font-size: 1.1rem;
          }
          
          .course-info {
            font-size: 0.9rem;
          }
          
          .stat-card-label {
            font-size: 0.85rem;
          }
          
          .stat-card-value {
            font-size: 1.5rem;
          }
          
          .fee-amount {
            font-size: 1rem;
          }
          
          .erp-card-body {
            padding: 0.5rem;
          }
          
          .erp-table td {
            padding: 0.75rem;
            font-size: 0.9rem;
          }
          
          .erp-table th {
            padding: 0.75rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}