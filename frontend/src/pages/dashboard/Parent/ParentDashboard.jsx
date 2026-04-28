// Parent Dashboard - Main overview page for parents
import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { toast } from "react-toastify";
import Breadcrumb from "../../../components/Breadcrumb";

import {
  FaUsers,
  FaUserGraduate,
  FaCalendarCheck,
  FaRupeeSign,
  FaBell,
  FaEye,
  FaChild,
  FaSchool,
} from "react-icons/fa";

export default function ParentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalChildren: 0,
    activeChildren: 0,
    totalFees: 0,
    pendingFees: 0,
  });

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "PARENT_GUARDIAN") {
    return <Navigate to="/dashboard" replace />;
  }

  /* ================= DATA FETCHING ================= */
  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await api.get("/parent/children");
      const childrenData = response.data.children || [];
      setChildren(childrenData);

      // Calculate stats
      const activeChildren = childrenData.filter(child =>
        child.status === "APPROVED"
      ).length;

      // Calculate total and pending fees for all children
      let totalFees = 0;
      let pendingFees = 0;

      for (const child of childrenData) {
        if (child.status === "APPROVED") {
          try {
            const feeResponse = await api.get(`/parent/student/${child._id}/fees`);
            const feeData = feeResponse.data;
            if (feeData) {
              totalFees += feeData.totalFee || 0;
              pendingFees += (feeData.totalFee - feeData.paidAmount) || 0;
            }
          } catch (feeError) {
            console.warn(`Failed to fetch fees for child ${child._id}:`, feeError);
          }
        }
      }

      setStats({
        totalChildren: childrenData.length,
        activeChildren,
        totalFees,
        pendingFees,
      });

    } catch (error) {
      toast.error("Failed to load children information");
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading your children..." />;
  }

  return (
    <div className="parent-dashboard-page">
      <div className="erp-container">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="erp-page-title">
              <FaChild className="me-3" />
              Parent Dashboard
            </h1>
            <p className="text-muted mb-0">
              Welcome back! Here's an overview of your children's academic progress.
            </p>
          </div>
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/dashboard/parent" },
            ]}
          />
        </div>

        {/* Stats Cards */}
        <div className="row mb-4">
          <div className="col-md-3 mb-3">
            <div className="card border-primary h-100">
              <div className="card-body text-center">
                <FaUsers className="text-primary mb-2" size={30} />
                <h4 className="card-title mb-1">{stats.totalChildren}</h4>
                <p className="card-text text-muted small">Total Children</p>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <div className="card border-success h-100">
              <div className="card-body text-center">
                <FaUserGraduate className="text-success mb-2" size={30} />
                <h4 className="card-title mb-1">{stats.activeChildren}</h4>
                <p className="card-text text-muted small">Active Students</p>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <div className="card border-info h-100">
              <div className="card-body text-center">
                <FaCalendarCheck className="text-info mb-2" size={30} />
                <h4 className="card-title mb-1">--</h4>
                <p className="card-text text-muted small">Avg Attendance</p>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <div className="card border-warning h-100">
              <div className="card-body text-center">
                <FaRupeeSign className="text-warning mb-2" size={30} />
                <h4 className="card-title mb-1">
                  {stats.pendingFees > 0 ? `₹${stats.pendingFees.toLocaleString()}` : "₹0"}
                </h4>
                <p className="card-text text-muted small">Pending Fees</p>
              </div>
            </div>
          </div>
        </div>

        {/* Children Overview */}
        <div className="card">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">
              <FaChild className="me-2" />
              My Children
            </h5>
          </div>
          <div className="card-body">
            {children.length === 0 ? (
              <div className="text-center py-5">
                <FaChild size={48} className="text-muted mb-3" />
                <h5 className="text-muted">No Children Found</h5>
                <p className="text-muted">
                  No student accounts are linked to your parent account yet.
                </p>
              </div>
            ) : (
              <div className="row">
                {children.map((child) => (
                  <div key={child._id} className="col-md-6 col-lg-4 mb-4">
                    <div className="card h-100 border-primary">
                      <div className="card-body">
                        <div className="d-flex align-items-center mb-3">
                          <div className="avatar-circle bg-primary text-white me-3">
                            {child.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h6 className="card-title mb-0">{child.fullName}</h6>
                            <small className="text-muted">
                              {child.course_id?.name} - Semester {child.currentSemester}
                            </small>
                          </div>
                        </div>

                        <div className="mb-3">
                          <span className={`badge ${
                            child.status === 'APPROVED' ? 'bg-success' :
                            child.status === 'PENDING' ? 'bg-warning' : 'bg-secondary'
                          }`}>
                            {child.status}
                          </span>
                        </div>

                         <div className="d-flex gap-2">
                           <button
                             className="btn btn-outline-primary btn-sm flex-fill"
                             onClick={() => navigate(`/dashboard/parent/child/${child._id}`)}
                           >
                             <FaEye className="me-1" />
                             View Details
                           </button>
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .parent-dashboard-page {
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
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
        }

        .card {
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }

        .card:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}