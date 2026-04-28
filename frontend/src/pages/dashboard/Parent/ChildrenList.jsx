// Children List - Shows all children linked to parent account
import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";

import {
  FaUsers,
  FaEye,
  FaCalendarCheck,
  FaRupeeSign,
  FaSearch,
  FaFilter,
  FaChild,
} from "react-icons/fa";

export default function ChildrenList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [filteredChildren, setFilteredChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "PARENT_GUARDIAN") {
    return <Navigate to="/dashboard" replace />;
  }

  /* ================= DATA FETCHING ================= */
  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    filterChildren();
  }, [children, searchTerm, statusFilter]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await api.get("/parent/children");
      setChildren(response.data.children || []);
    } catch (error) {
      toast.error("Failed to load children information");
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterChildren = () => {
    let filtered = children;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(child =>
        child.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        child.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(child => child.status === statusFilter);
    }

    setFilteredChildren(filtered);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      APPROVED: { label: "Active", className: "bg-success" },
      PENDING: { label: "Pending", className: "bg-warning" },
      REJECTED: { label: "Rejected", className: "bg-danger" },
      DEACTIVATED: { label: "Inactive", className: "bg-secondary" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-secondary" };
    return <span className={`badge ${config.className}`}>{config.label}</span>;
  };

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading your children..." />;
  }

  return (
    <div className="children-list-page">
      <div className="erp-container">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="erp-page-title">
              <FaUsers className="me-3" />
              My Children
            </h1>
            <p className="text-muted mb-0">
              View and manage all your children's academic information.
            </p>
          </div>
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/dashboard/parent" },
              { label: "My Children", path: "/dashboard/parent/children" },
            ]}
          />
        </div>

        {/* Filters */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text">
                    <FaSearch />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, emailer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="APPROVED">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="DEACTIVATED">Inactive</option>
                </select>
              </div>
              <div className="col-md-3">
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-secondary flex-fill"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("ALL");
                    }}
                  >
                    <FaFilter className="me-1" />
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Children List */}
        <div className="card">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FaChild className="me-2" />
              Children ({filteredChildren.length})
            </h5>
            <small>Total: {children.length}</small>
          </div>
          <div className="card-body p-0">
            {filteredChildren.length === 0 ? (
              <div className="text-center py-5">
                <FaChild size={48} className="text-muted mb-3" />
                <h5 className="text-muted">
                  {children.length === 0 ? "No Children Found" : "No Children Match Your Search"}
                </h5>
                <p className="text-muted">
                  {children.length === 0
                    ? "No student accounts are linked to your parent account yet."
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChildren.map((child) => (
                      <tr key={child._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar-circle bg-primary text-white me-3">
                              {child.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-bold">{child.fullName}</div>
                              <small className="text-muted">{child.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="fw-semibold">{child.course_id?.name}</div>
                            <small className="text-muted">
                              Semester {child.currentSemester}
                            </small>
                          </div>
                        </td>
                        <td>
                          {getStatusBadge(child.status)}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => navigate(`/dashboard/parent/child/${child._id}`)}
                              title="View Details"
                            >
                              <FaEye className="me-1" />
                              View
                            </button>
                            {child.status === "APPROVED" && (
                              <>
                                <button
                                  className="btn btn-outline-info btn-sm"
                                  onClick={() => navigate(`/dashboard/parent/child/${child._id}/attendance`)}
                                  title="View Attendance"
                                >
                                  <FaCalendarCheck className="me-1" />
                                  Attendance
                                </button>
                                <button
                                  className="btn btn-outline-success btn-sm"
                                  onClick={() => navigate(`/dashboard/parent/child/${child._id}/fees`)}
                                  title="View Fees"
                                >
                                  <FaRupeeSign className="me-1" />
                                  Fees
                                </button>
                              </>
                            )}
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
      </div>

      <style jsx>{`
        .children-list-page {
          padding: 20px;
          background: #f8f9fa;
          min-height: 100vh;
        }

        .erp-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .erp-page-title {
          color: #2d3748;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
        }

        .card {
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .table th {
          border-top: none;
          font-weight: 600;
          color: #495057;
        }

        .table td {
          vertical-align: middle;
        }

        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}