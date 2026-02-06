import { useContext, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaChalkboardTeacher,
  FaEdit,
  FaTrash,
  FaPlus,
  FaEye,
  FaSearch,
  FaFilter,
  FaSyncAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserGraduate,
  FaUserCheck,
  FaUserTimes,
  FaEnvelope,
  FaBriefcase,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaInfoCircle,
  FaSpinner,
  FaBuilding,
  FaIdBadge,
  FaGraduationCap,
  FaMapMarkerAlt,
  FaPhone
} from "react-icons/fa";

export default function TeachersList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });

  /* ================= LOAD TEACHERS ================= */
  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/teachers");
      const data = res.data || [];
      setTeachers(data);
      
      // Calculate stats from fetched data (client-side only)
      setStats({
        total: data.length,
        active: data.filter(t => t.status === "ACTIVE").length,
        inactive: data.filter(t => t.status === "INACTIVE").length
      });
    } catch (err) {
      setError("Failed to load teachers. Please try again.");
      console.error("Teachers fetch error:", err);
      setTeachers([]);
      setStats({ total: 0, active: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchTeachers();
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

    const sorted = [...teachers].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setTeachers(sorted);
  };

  /* ================= FILTERING ================= */
  const getFilteredTeachers = () => {
    return teachers
      .filter(teacher => 
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.designation && teacher.designation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (teacher.employeeId && teacher.employeeId.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .filter(teacher => 
        filterStatus === "ALL" || teacher.status === filterStatus
      );
  };

  /* ================= DELETE ================= */
  const deleteTeacher = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this teacher? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/teachers/${id}`);
      fetchTeachers();
    } catch (err) {
      alert("Failed to delete teacher. Please try again.");
      console.error("Delete teacher error:", err);
    }
  };

  /* ================= LOADING SKELETON ================= */
  const renderSkeleton = () => (
    <div className="skeleton-table-container">
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
      
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-header-cell"></div>
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-table-row">
            <div className="skeleton-cell skeleton-avatar"></div>
            <div className="skeleton-cell skeleton-text long"></div>
            <div className="skeleton-cell skeleton-text medium"></div>
            <div className="skeleton-cell skeleton-text medium"></div>
            <div className="skeleton-cell skeleton-badge"></div>
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
          <FaExclamationTriangle />
        </div>
        <h3>Teachers Loading Error</h3>
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
            <FaSyncAlt className="erp-btn-icon" />
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
        <h4 className="erp-loading-text">Loading teachers...</h4>
        <div className="loading-progress">
          <div className="progress-bar"></div>
        </div>
        {renderSkeleton()}
      </div>
    );
  }

  const filteredTeachers = getFilteredTeachers();
  const hasTeachers = teachers.length > 0;
  const hasResults = filteredTeachers.length > 0;

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item active" aria-current="page">Teachers Management</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaChalkboardTeacher />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Teachers Management</h1>
            <p className="erp-page-subtitle">
              Manage faculty members and their academic assignments
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => navigate("/teachers/add-teacher")}
          >
            <FaPlus className="erp-btn-icon" />
            <span>Add New Teacher</span>
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      {hasTeachers && (
        <div className="stats-grid animate-fade-in">
          <div className="stat-card">
            <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
              <FaChalkboardTeacher />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-label">Total Teachers</div>
              <div className="stat-card-value">{stats.total}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
              <FaUserCheck />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-label">Active Teachers</div>
              <div className="stat-card-value">{stats.active}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
              <FaUserTimes />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-label">Inactive Teachers</div>
              <div className="stat-card-value">{stats.inactive}</div>
            </div>
          </div>
        </div>
      )}

      {/* FILTERS SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-body">
          <div className="filters-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search teachers by name, email, ID, or designation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search teachers"
              />
            </div>
            
            <div className="filter-group">
              <button className="filter-btn" aria-label="Open status filter">
                <FaFilter className="filter-icon" />
                <span>Filter: {filterStatus === "ALL" ? "All" : filterStatus}</span>
                <FaChevronDown className="filter-arrow" />
              </button>
              <div className="filter-dropdown">
                <div className="filter-section">
                  <label>Status Filter</label>
                  <div className="filter-options">
                    {["ALL", "ACTIVE", "INACTIVE"].map(status => (
                      <label key={status} className="filter-option">
                        <input
                          type="radio"
                          name="status"
                          value={status}
                          checked={filterStatus === status}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          aria-label={`Filter by ${status} teachers`}
                        />
                        <span>{status}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              className="reset-btn"
              onClick={() => {
                setSearchTerm("");
                setFilterStatus("ALL");
              }}
              aria-label="Reset filters"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* TEACHERS TABLE */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaChalkboardTeacher className="erp-card-icon" />
            Teachers List
          </h3>
          <span className="teacher-count">
            {filteredTeachers.length} {filteredTeachers.length === 1 ? "Teacher" : "Teachers"}
          </span>
        </div>
        
        <div className="erp-card-body">
          {loading ? (
            renderSkeleton()
          ) : !hasTeachers ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaChalkboardTeacher />
              </div>
              <h3>No Teachers Found</h3>
              <p className="empty-description">
                There are no teachers registered in your college yet.
              </p>
              <button 
                className="erp-btn erp-btn-primary empty-action"
                onClick={() => navigate("/teachers/add-teacher")}
                aria-label="Add your first teacher"
              >
                <FaPlus className="erp-btn-icon" />
                Add Your First Teacher
              </button>
            </div>
          ) : !hasResults ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FaSearch />
              </div>
              <h3>No Results Found</h3>
              <p className="empty-description">
                No teachers match your search criteria. Try adjusting your filters.
              </p>
              <button 
                className="erp-btn erp-btn-secondary empty-action"
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("ALL");
                }}
                aria-label="Reset filters"
              >
                <FaSyncAlt className="erp-btn-icon" />
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th className="th-avatar"></th>
                    <th onClick={() => handleSort('name')} className="sortable">
                      Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                    </th>
                    <th onClick={() => handleSort('employeeId')} className="sortable">
                      Employee ID {sortConfig.key === 'employeeId' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                    </th>
                    <th onClick={() => handleSort('email')} className="sortable">
                      Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                    </th>
                    <th onClick={() => handleSort('designation')} className="sortable">
                      Designation {sortConfig.key === 'designation' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                    </th>
                    <th onClick={() => handleSort('status')} className="sortable">
                      Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                    </th>
                    <th className="th-actions text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((teacher, index) => (
                    <tr key={teacher._id} className="table-row">
                      <td className="td-avatar">
                        <div className="teacher-avatar" aria-label={`Avatar for ${teacher.name}`}>
                          {teacher.name.charAt(0).toUpperCase()}
                        </div>
                      </td>
                      <td>
                        <div className="teacher-name">
                          <div className="teacher-title">{teacher.name}</div>
                          <div className="teacher-meta">
                            <span className="teacher-role">{teacher.designation || "Faculty"}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="employee-id-badge">
                          <FaIdBadge className="badge-icon" />
                          {teacher.employeeId || "N/A"}
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <FaEnvelope className="contact-icon" />
                          <span>{teacher.email}</span>
                        </div>
                      </td>
                      <td>
                        <div className="designation-badge">
                          <FaBriefcase className="badge-icon" />
                          {teacher.designation || "N/A"}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge status-${teacher.status?.toLowerCase() || 'inactive'}`}>
                          {teacher.status || "INACTIVE"}
                        </span>
                      </td>
                      <td className="action-cell">
                        <div className="action-buttons">
                          <Link
                            to={`/teachers/view/${teacher._id}`}
                            className="action-btn view-btn"
                            title="View Details"
                            aria-label={`View details for ${teacher.name}`}
                          >
                            <FaEye />
                          </Link>
                          <Link
                            to={`/teachers/edit/${teacher._id}`}
                            className="action-btn edit-btn"
                            title="Edit Teacher"
                            aria-label={`Edit ${teacher.name}`}
                          >
                            <FaEdit />
                          </Link>
                          <button
                            className="action-btn delete-btn"
                            title="Delete Teacher"
                            onClick={() => deleteTeacher(teacher._id)}
                            aria-label={`Delete ${teacher.name}`}
                          >
                            <FaTrash />
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
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
        
        /* FILTERS CARD */
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
        
        .teacher-count {
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
        
        .filters-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.75rem;
          flex-wrap: wrap;
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
          transition: all 0.3s ease;
        }
        
        .search-box input:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
        }
        
        .filter-group {
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
          transition: all 0.3s ease;
        }
        
        .filter-btn:hover {
          border-color: #1a4b6d;
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
        
        .filter-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          padding: 1rem;
          width: 220px;
          z-index: 1000;
          display: none;
        }
        
        .filter-group:hover .filter-dropdown {
          display: block;
        }
        
        .filter-section {
          margin-bottom: 0.75rem;
        }
        
        .filter-section label {
          display: block;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        
        .filter-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .filter-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .filter-option:hover {
          background: #f0f5ff;
        }
        
        .filter-option input[type="radio"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        
        .reset-btn {
          background: #e9ecef;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-weight: 500;
          color: #495057;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .reset-btn:hover {
          background: #dee2e6;
          transform: translateY(-1px);
        }
        
        /* TABLE */
        .table-container {
          overflow-x: auto;
          border-radius: 0 0 16px 16px;
        }
        
        .erp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
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
          position: relative;
          white-space: nowrap;
        }
        
        .erp-table th.sortable {
          cursor: pointer;
          user-select: none;
        }
        
        .erp-table th.sortable:hover {
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
        
        .th-avatar {
          width: 60px;
        }
        
        .th-actions {
          width: 160px;
        }
        
        .erp-table tbody tr {
          border-bottom: 1px solid #f0f2f5;
          transition: all 0.2s ease;
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
        
        .td-avatar {
          width: 60px;
          padding: 0.5rem 1.25rem;
        }
        
        .teacher-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1.1rem;
          flex-shrink: 0;
          margin: 0 auto;
        }
        
        .teacher-name {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .teacher-title {
          font-weight: 600;
          color: #1a4b6d;
          font-size: 0.95rem;
        }
        
        .teacher-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        
        .teacher-role {
          font-size: 0.8rem;
          color: #6c757d;
          background: #f0f2f5;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
        }
        
        .employee-id-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #e3f2fd;
          color: #1976d2;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .badge-icon {
          font-size: 0.85rem;
        }
        
        .contact-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #1a4b6d;
        }
        
        .contact-icon {
          color: #6c757d;
          font-size: 0.9rem;
        }
        
        .designation-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #e8f5e9;
          color: #2e7d32;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .status-badge {
          display: inline-block;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        
        .status-active {
          background: rgba(76, 175, 80, 0.1);
          color: #4CAF50;
        }
        
        .status-inactive {
          background: rgba(158, 158, 158, 0.1);
          color: #9e9e9e;
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
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .action-btn:active {
          transform: translateY(0);
        }
        
        /* SKELETON LOADING */
        .skeleton-table-container {
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
          grid-template-columns: 60px repeat(5, 1fr) 160px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        .skeleton-header-cell {
          height: 40px;
          background: #e9ecef;
        }
        
        .skeleton-table-row {
          display: grid;
          grid-template-columns: 60px repeat(5, 1fr) 160px;
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
        
        .skeleton-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          margin: 0 auto;
        }
        
        .skeleton-text.long { width: 80%; }
        .skeleton-text.medium { width: 60%; }
        .skeleton-badge { width: 50%; height: 20px; }
        .skeleton-actions { display: flex; gap: 0.5rem; justify-content: center; }
        .skeleton-action { width: 36px; height: 36px; border-radius: 8px; }
        
        @keyframes skeleton-loading {
          to { left: 100%; }
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
        
        @keyframes progressPulse {
          0%, 100% { width: 35%; }
          50% { width: 65%; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 992px) {
          .filters-container {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-box {
            min-width: auto;
          }
          
          .filter-group,
          .reset-btn {
            width: 100%;
            justify-content: center;
          }
          
          .erp-table {
            min-width: 750px;
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
          
          .teacher-count {
            align-self: flex-end;
          }
          
          .erp-table {
            min-width: 650px;
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
          
          .th-actions,
          .td-actions {
            display: none;
          }
        }
        
        @media (max-width: 480px) {
          .erp-table {
            min-width: 550px;
          }
          
          .erp-card-header h3 {
            font-size: 1.25rem;
          }
          
          .erp-card-header .erp-card-icon {
            font-size: 1.1rem;
          }
          
          .teacher-name {
            font-size: 0.9rem;
          }
          
          .stat-card-label {
            font-size: 0.85rem;
          }
          
          .stat-card-value {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}