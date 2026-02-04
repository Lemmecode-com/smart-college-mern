import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBuilding,
  FaEdit,
  FaTrash,
  FaUserTie,
  FaSearch,
  FaPlus,
  FaInfoCircle,
  FaSync,
  FaCheckCircle,
  FaTimesCircle,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaBook,
  FaFilter,
  FaDownload,
  FaPrint,
  FaEye,
  FaArrowLeft,
  FaTimes
} from "react-icons/fa";

export default function DepartmentList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH ================= */
  const fetchDepartments = async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department? This action cannot be undone.")) return;
    
    try {
      await api.delete(`/departments/${id}`);
      fetchDepartments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete department");
    }
  };

  /* ================= FILTER LOGIC ================= */
  const filteredDepartments = departments.filter((d) => {
    const matchesSearch = 
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.code?.toLowerCase().includes(search.toLowerCase()) ||
      d.type?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "All" || 
      d.status === statusFilter.toUpperCase();
    
    const matchesType = 
      typeFilter === "All" || 
      d.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  /* ================= RESET FILTERS ================= */
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
  };

  /* ================= GET UNIQUE TYPES ================= */
  const getUniqueTypes = () => {
    const types = new Set();
    departments.forEach(d => {
      if (d.type) types.add(d.type);
    });
    return Array.from(types);
  };

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="text-muted">Loading Departments...</h5>
                <p className="text-muted small">Fetching department data from server</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3 py-md-4 animate-fade-in">
      {/* ================= TOP BAR ================= */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-3 mb-md-4 animate-slide-down">
        <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
          <div className="header-icon-container bg-gradient-primary text-white rounded-circle d-flex align-items-center justify-content-center pulse-icon">
            <FaBuilding size={28} />
          </div>
          <div>
            <h1 className="h4 h3-md fw-bold mb-1 text-dark">Department Management</h1>
            <p className="text-muted mb-0 small">
              <FaGraduationCap className="me-1" />
              Manage academic departments and faculty assignments
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="btn btn-outline-info d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Department Management Help"
          >
            <FaInfoCircle size={16} /> Help
          </button>
          
          <button 
            onClick={fetchDepartments}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Refresh Departments"
          >
            <FaSync className="spin-icon" size={16} /> Refresh
          </button>
          
          <button 
            onClick={() => navigate("/departments/add")}
            className="btn btn-success d-flex align-items-center gap-2 px-4 py-2 pulse-button"
          >
            <FaPlus size={16} /> Add Department
          </button>
        </div>
      </div>

      {/* ================= HELP TOOLTIP ================= */}
      {showHelp && (
        <div className="alert alert-info border-0 bg-info bg-opacity-10 rounded-4 mb-3 mb-md-4 animate-fade-in">
          <div className="d-flex align-items-start gap-2">
            <FaInfoCircle className="mt-1 flex-shrink-0" size={20} />
            <div>
              <h6 className="fw-bold mb-1">Department Management Tips</h6>
              <ul className="mb-0 small ps-3">
                <li>Use search to find departments by name, code, or type</li>
                <li>Filter by status (Active/Inactive) or department type</li>
                <li>Click <FaEdit className="mx-1" size={12} /> to edit department details</li>
                <li>Click <FaUserTie className="mx-1" size={12} /> to assign Head of Department (HOD)</li>
                <li>Click <FaEye className="mx-1" size={12} /> to view department details</li>
                <li>Only departments with no students can be deleted</li>
              </ul>
              <button 
                onClick={() => setShowHelp(false)} 
                className="btn btn-sm btn-outline-info mt-2 px-3"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SEARCH & FILTER BAR ================= */}
      <div className="card border-0 shadow-lg rounded-4 mb-3 mb-md-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="card-body p-3 p-md-4">
          <div className="row g-3 align-items-end">
            <div className="col-md-6 col-lg-4">
              <label className="form-label fw-semibold text-dark small">Search Departments</label>
              <div className="input-group search-container">
                <span className="input-group-text bg-light border-end-0">
                  <FaSearch className="text-muted blink-slow" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0 shadow-none"
                  placeholder="Search by name, code, or type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button 
                    className="btn btn-sm btn-outline-secondary position-absolute end-0 me-3"
                    onClick={() => setSearch("")}
                    style={{ zIndex: 10 }}
                  >
                    <FaTimes size={10} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="col-md-6 col-lg-3">
              <label className="form-label fw-semibold text-dark small">Filter by Status</label>
              <select 
                className="form-select shadow-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            
            <div className="col-md-6 col-lg-3">
              <label className="form-label fw-semibold text-dark small">Filter by Type</label>
              <select 
                className="form-select shadow-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All Types</option>
                {getUniqueTypes().map((type, idx) => (
                  <option key={idx} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="col-md-6 col-lg-2 d-flex align-items-end">
              <div className="w-100 d-grid gap-2">
                <button 
                  className="btn btn-primary d-flex align-items-center justify-content-center gap-1 w-100"
                  onClick={() => {}}
                >
                  <FaFilter size={14} /> Apply Filters
                </button>
                <button 
                  className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-1 w-100"
                  onClick={resetFilters}
                >
                  <FaTimes size={12} /> Reset Filters
                </button>
              </div>
            </div>
          </div>
          
          {/* ================= ACTIVE FILTERS BADGES ================= */}
          {(search || statusFilter !== "All" || typeFilter !== "All") && (
            <div className="mt-3 pt-3 border-top">
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <small className="text-muted me-2">Active Filters:</small>
                {search && (
                  <span className="badge bg-primary">
                    Search: "{search}"
                    <button 
                      onClick={() => setSearch("")} 
                      className="ms-2 btn-close btn-close-white"
                      style={{ fontSize: '0.6rem' }}
                    ></button>
                  </span>
                )}
                {statusFilter !== "All" && (
                  <span className="badge bg-success">
                    Status: {statusFilter}
                    <button 
                      onClick={() => setStatusFilter("All")} 
                      className="ms-2 btn-close btn-close-white"
                      style={{ fontSize: '0.6rem' }}
                    ></button>
                  </span>
                )}
                {typeFilter !== "All" && (
                  <span className="badge bg-info text-dark">
                    Type: {typeFilter}
                    <button 
                      onClick={() => setTypeFilter("All")} 
                      className="ms-2 btn-close"
                      style={{ fontSize: '0.6rem' }}
                    ></button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= DEPARTMENTS TABLE ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="card-header bg-gradient-primary text-white py-3 py-md-4">
          <div className="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center gap-3">
            <h2 className="h5 h6-md fw-bold mb-0 d-flex align-items-center gap-2">
              <FaBuilding /> Department List
              <span className="badge bg-light text-dark">
                {filteredDepartments.length} of {departments.length} departments
              </span>
            </h2>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-light d-flex align-items-center gap-1">
                <FaPrint size={12} /> Print
              </button>
              <button className="btn btn-sm btn-light d-flex align-items-center gap-1">
                <FaDownload size={12} /> Export PDF
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body p-0">
          {filteredDepartments.length === 0 ? (
            <div className="text-center py-5 px-3">
              <FaBuilding className="text-muted mb-3" size={64} />
              <h5 className="text-muted mb-2">No Departments Found</h5>
              <p className="text-muted mb-4">
                {search || statusFilter !== "All" || typeFilter !== "All" 
                  ? "Try adjusting your filters or search criteria" 
                  : "No departments available in the system"}
              </p>
              {(search || statusFilter !== "All" || typeFilter !== "All") && (
                <button 
                  onClick={resetFilters}
                  className="btn btn-outline-primary px-4 py-2 d-flex align-items-center gap-2 mx-auto mb-3"
                >
                  <FaTimes size={14} /> Clear Filters
                </button>
              )}
              <button 
                onClick={() => navigate("/departments/add")}
                className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2 mx-auto"
              >
                <FaPlus /> Add Department
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th width="5%" className="ps-4">Sr.No</th>
                    <th width="20%">Department</th>
                    <th width="10%">Code</th>
                    <th width="10%">Type</th>
                    <th width="10%">Status</th>
                    <th width="12%">Programs</th>
                    <th width="8%">Start Year</th>
                    <th width="8%">Faculty</th>
                    <th width="8%">Students</th>
                    <th width="10%" className="text-center pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((d, index) => (
                    <tr 
                      key={d._id} 
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="ps-4 fw-medium">{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="department-icon bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                            <FaGraduationCap size={16} />
                          </div>
                          <div>
                            <div className="fw-bold">{d.name}</div>
                            <div className="text-muted small">{d.establishedYear || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="fw-medium">{d.code}</td>
                      <td>
                        <span className="badge bg-info bg-opacity-25 text-info">{d.type || 'N/A'}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          d.status === "ACTIVE" 
                            ? "bg-success" 
                            : d.status === "INACTIVE" 
                              ? "bg-secondary" 
                              : "bg-warning"
                        }`}>
                          {d.status === "ACTIVE" && <FaCheckCircle className="me-1" />}
                          {d.status === "INACTIVE" && <FaTimesCircle className="me-1" />}
                          {d.status}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {(d.programsOffered || []).slice(0, 2).map((prog, i) => (
                            <span key={i} className="badge bg-light text-dark border">{prog}</span>
                          ))}
                          {(d.programsOffered || []).length > 2 && (
                            <span className="badge bg-secondary">+{(d.programsOffered || []).length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td>{d.startYear || 'N/A'}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <FaChalkboardTeacher className="text-primary" size={14} />
                          <span>{d.sanctionedFacultyCount || 0}</span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <FaGraduationCap className="text-success" size={14} />
                          <span>{d.sanctionedStudentIntake || 0}</span>
                        </div>
                      </td>
                      <td className="text-center pe-4">
                        <div className="d-flex justify-content-center gap-1">
                          <button
                            className="btn btn-sm btn-outline-info hover-lift"
                            title="View Details"
                            onClick={() => navigate(`/departments/view/${d._id}`)}
                          >
                            <FaEye size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary hover-lift"
                            title="Edit Department"
                            onClick={() => navigate(`/departments/edit/${d._id}`)}
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-warning hover-lift"
                            title="Assign HOD"
                            onClick={() => navigate(`/departments/assign-hod/${d._id}`)}
                          >
                            <FaUserTie size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger hover-lift"
                            title="Delete Department"
                            onClick={() => handleDelete(d._id)}
                          >
                            <FaTrash size={14} />
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
        
        {/* ================= TABLE FOOTER ================= */}
        {filteredDepartments.length > 0 && (
          <div className="card-footer bg-light py-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div className="text-muted small">
                Showing <strong>{filteredDepartments.length}</strong> of <strong>{departments.length}</strong> departments
              </div>
              <nav>
                <ul className="pagination mb-0">
                  <li className="page-item disabled">
                    <button className="page-link">Previous</button>
                  </li>
                  <li className="page-item active">
                    <button className="page-link">1</button>
                  </li>
                  <li className="page-item">
                    <button className="page-link">2</button>
                  </li>
                  <li className="page-item">
                    <button className="page-link">Next</button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* ================= FOOTER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mt-3 mt-md-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        <div className="card-body p-3 p-md-4 bg-light">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-center text-md-start">
              <p className="mb-1">
                <small className="text-muted">
                  <FaBuilding className="me-1" />
                  Department Management System | Smart College ERP
                </small>
              </p>
              <p className="mb-0">
                <small className="text-muted">
                  <FaSync className="spin-icon me-1" />
                  Last Updated: <strong>{new Date().toLocaleString()}</strong>
                </small>
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button 
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                onClick={() => navigate("/dashboard")}
              >
                <FaArrowLeft size={12} /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 75, 109, 0.4); }
          70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(26, 75, 109, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 75, 109, 0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes lift {
          to { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.5s ease-out forwards; }
        .animate-fade-in-up { animation: slideUp 0.6s ease-out forwards; }
        .pulse-icon { animation: pulse 2s infinite; }
        .blink { animation: blink 1.5s infinite; }
        .blink-slow { animation: blink 2.5s infinite; }
        .hover-lift:hover { animation: lift 0.3s ease forwards; }
        .spin-icon { animation: spin 1s linear infinite; }
        .float-badge { animation: float 3s ease-in-out infinite; }
        .pulse-button { position: relative; overflow: hidden; }
        .pulse-button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 5px;
          height: 5px;
          background: rgba(255,255,255,0.5);
          opacity: 0;
          border-radius: 100%;
          transform: scale(1, 1) translate(-50%);
          transform-origin: 50% 50%;
        }
        .pulse-button:focus:not(:active)::after {
          animation: ripple 1s ease-out;
        }
        @keyframes ripple {
          0% { transform: scale(0, 0); opacity: 0.5; }
          100% { transform: scale(100, 100); opacity: 0; }
        }

        .bg-gradient-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .header-icon-container {
          width: 60px;
          height: 60px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        .search-container {
          position: relative;
        }
        .search-container .btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
        }

        .department-icon {
          font-size: 18px;
        }

        .table thead th {
          font-weight: 600;
          color: #495057;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .table tbody tr:hover {
          background-color: rgba(248, 249, 250, 0.7);
          transform: translateX(5px);
          transition: all 0.3s ease;
        }
        .table td {
          vertical-align: middle;
          padding: 1rem 0.75rem;
        }
        .table .badge {
          font-size: 0.75rem;
          padding: 0.4rem 0.6rem;
        }

        .pagination .page-item.active .page-link {
          background-color: #1a4b6d;
          border-color: #1a4b6d;
        }
        .pagination .page-link {
          color: #1a4b6d;
        }
        .pagination .page-link:hover {
          background-color: #e9ecef;
        }

        @media (max-width: 992px) {
          .table thead th:nth-child(n+6),
          .table tbody td:nth-child(n+6) {
            display: none;
          }
          .header-icon-container {
            width: 50px;
            height: 50px;
          }
        }

        @media (max-width: 768px) {
          .table thead th:nth-child(n+5),
          .table tbody td:nth-child(n+5) {
            display: none;
          }
          .h3-md {
            font-size: 1.5rem !important;
          }
        }

        @media (max-width: 576px) {
          .table thead th:nth-child(n+4),
          .table tbody td:nth-child(n+4) {
            display: none;
          }
          .header-icon-container {
            width: 45px;
            height: 45px;
          }
          .btn-sm {
            padding: 0.25rem 0.5rem !important;
            font-size: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}