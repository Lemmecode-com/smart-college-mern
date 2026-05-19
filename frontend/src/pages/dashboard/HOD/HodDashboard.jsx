import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaChartBar,
  FaUserTie,
  FaChalkboardTeacher,
  FaUsers,
  FaCalendarAlt,
  FaLayerGroup,
  FaListUl,
  FaInfoCircle,
  FaClipboardList,
  FaUser,
  FaStar
} from "react-icons/fa";
import { toast } from "react-toastify";

const HodDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHodDashboard();
  }, []);

  const fetchHodDashboard = async () => {
     try {
       setLoading(true);
       const response = await api.get("/hod/dashboard");
       setDashboardData(response.data);
    } catch (error) {
      console.error("HOD Dashboard error:", error);
      toast.error(
        error.response?.data?.message || "Failed to load HOD dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading HOD Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <p className="text-muted">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hod-dashboard">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            <FaUserTie className="me-2 text-primary" />
            HOD Dashboard
          </h2>
          <p className="text-muted">
            Managing {dashboardData.department?.name || "Department"}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="fs-1 text-primary mb-2">
                <FaUsers />
              </div>
              <h5 className="fw-bold mb-1">
                {dashboardData.stats?.teachers || 0}
              </h5>
              <p className="text-muted mb-0">Teachers</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="fs-1 text-info mb-2">
                <FaCalendarAlt />
              </div>
              <h5 className="fw-bold mb-1">
                {dashboardData.stats?.timetables || 0}
              </h5>
              <p className="text-muted mb-0">Timetables</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="fs-1 text-success mb-2">
                <FaChalkboardTeacher />
              </div>
              <h5 className="fw-bold mb-1">Active</h5>
              <p className="text-muted mb-0">Classes</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="fs-1 text-warning mb-2">
                <FaChartBar />
              </div>
              <h5 className="fw-bold mb-1">Pending</h5>
              <p className="text-muted mb-0">Approvals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                <FaChartBar className="me-2" />
                Quick Actions
              </h5>
              <div className="d-grid gap-2">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => navigate("/teacher/timetable")}
                >
                  <FaCalendarAlt className="me-2" /> Manage Timetable
                </button>
                <button
                  className="btn btn-outline-success"
                  onClick={() => navigate("/teacher/attendance")}
                >
                  <FaClipboardList className="me-2" /> Attendance Overview
                </button>
                <button
                  className="btn btn-outline-info"
                  onClick={() => navigate("/teacher/profile")}
                >
                  <FaUser className="me-2" /> My Profile
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-8">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                <FaListUl className="me-2" />
                Recent Timetables
              </h5>
              {dashboardData.recentTimetables && dashboardData.recentTimetables.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recentTimetables.map((timetable) => (
                        <tr key={timetable._id}>
                          <td>{timetable.name}</td>
                          <td>{new Date(timetable.startDate).toLocaleDateString()}</td>
                          <td>{new Date(timetable.endDate).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge bg-${timetable.status === "PUBLISHED" ? "success" : timetable.status === "DRAFT" ? "warning" : "secondary"}`}>
                              {timetable.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => navigate(`/teacher/timetable/${timetable._id}`)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted mb-0">No recent timetables</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Department Info */}
      <div className="row">
        <div className="col-md-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                <FaLayerGroup className="me-2" />
                Department Information
              </h5>
              <div className="row">
                <div className="col-md-6">
                  <p className="mb-1"><strong>Department Name:</strong> {dashboardData.department?.name || "N/A"}</p>
                  <p className="mb-1"><strong>Department Code:</strong> {dashboardData.department?.code || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <p className="mb-1"><strong>HOD Name:</strong> {dashboardData.department?.hod_id?.name || "N/A"}</p>
                  <p className="mb-1"><strong>Employee ID:</strong> {dashboardData.department?.hod_id?.employeeId || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 class="fw-bold mb-3">
                <FaInfoCircle className="me-2" />
                About HOD Role
              </h5>
              <p className="text-muted">
                As the Head of Department, you have authority to manage timetables, view teacher information, 
                and oversee academic activities within your department. Your responsibilities include:
              </p>
              <ul className="text-muted ms-4">
                <li>Creating and managing department timetables</li>
                <li>Viewing teacher profiles and information</li>
                <li>Overseeing class schedules and allocations</li>
                <li>Ensuring academic compliance within your department</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HodDashboard;