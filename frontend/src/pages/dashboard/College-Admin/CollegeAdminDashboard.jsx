import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUniversity,
  FaUsers,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaUserCheck,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaPlus,
  FaSpinner,
  FaEye,
  FaFileAlt,
  FaBell,
  FaCalendarAlt,
  FaGraduationCap,
  FaAward,
} from "react-icons/fa";

export default function CollegeAdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalDepartments: 0,
    totalCourses: 0,
    pendingAdmissions: 0,
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [pendingAdmissions, setPendingAdmissions] = useState([]);
  const [activeSection, setActiveSection] = useState("overview");

  /* ================= QUICK ACTIONS ================= */
  const quickActions = [
    {
      id: 1,
      icon: FaUsers,
      label: "Approve Students",
      path: "/students/approve",
      color: "#4CAF50",
    },
    {
      id: 2,
      icon: FaChalkboardTeacher,
      label: "Manage Teachers",
      path: "/teachers",
      color: "#2196F3",
    },
    {
      id: 3,
      icon: FaLayerGroup,
      label: "Manage Courses",
      path: "/courses",
      color: "#FF9800",
    },
    {
      id: 4,
      icon: FaCalendarAlt,
      label: "Create Timetable",
      path: "/timetable/create",
      color: "#E91E63",
    },
    {
      id: 5,
      icon: FaBell,
      label: "Send Notification",
      path: "/notification/create",
      color: "#607D8B",
    },
    {
      id: 6,
      icon: FaFileAlt,
      label: "View Reports",
      path: "/reports",
      color: "#3F51B5",
    },
  ];

  /* ================= LOAD DASHBOARD DATA ================= */
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get("/dashboard/college-admin");
        const data = res.data;

        // Set statistics
        setStats({
          totalStudents: data.stats.totalStudents || 0,
          totalTeachers: data.stats.totalTeachers || 0,
          totalDepartments: data.stats.totalDepartments || 0,
          totalCourses: data.stats.totalCourses || 0,
          pendingAdmissions: data.stats.pendingAdmissions || 0,
        });

        // Set recent students
        setRecentStudents(data.recentStudents || []);

        // Set pending admissions
        setPendingAdmissions(data.pendingAdmissions || []);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError(
          err.response?.data?.message ||
            "Failed to load dashboard data. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  /* ================= NAVIGATION HANDLER ================= */
  const handleNavigate = (path) => {
    navigate(path);
  };

  /* ================= STATS CARDS ================= */
  const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <div className="stat-card" style={{ borderColor: color }}>
      <div className="stat-icon" style={{ background: color }}>
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );

  /* ================= QUICK ACTION CARD ================= */
  const QuickActionCard = ({ icon: Icon, label, color, path }) => (
    <div
      className="quick-action-card"
      onClick={() => handleNavigate(path)}
      style={{ borderColor: color }}
    >
      <div className="quick-action-icon" style={{ background: color }}>
        <Icon size={22} />
      </div>
      <div className="quick-action-label">{label}</div>
      <div className="quick-action-arrow">
        <FaArrowRight size={14} />
      </div>
    </div>
  );

  /* ================= STUDENT ITEM ================= */
  const StudentItem = ({ student, isPending = false }) => {
    const getStatusColor = (status) => {
      switch (status?.toUpperCase()) {
        case "APPROVED":
          return "#4CAF50";
        case "REJECTED":
          return "#F44336";
        case "PENDING":
          return "#FF9800";
        default:
          return "#9E9E9E";
      }
    };

    const getStatusIcon = (status) => {
      switch (status?.toUpperCase()) {
        case "APPROVED":
          return <FaCheckCircle />;
        case "REJECTED":
          return <FaExclamationTriangle />;
        case "PENDING":
          return <FaClock />;
        default:
          return <FaUserCheck />;
      }
    };

    return (
      <div className="student-item">
        <div className="student-avatar">
          {student.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="student-details">
          <div className="student-name">{student.fullName}</div>
          <div className="student-meta">
            {isPending ? (
              <span className="status-badge pending">
                <FaClock className="status-icon" />
                Pending Admission
              </span>
            ) : (
              <span
                className="status-badge"
                style={{
                  background: `${getStatusColor(student.status)}15`,
                  color: getStatusColor(student.status),
                }}
              >
                {getStatusIcon(student.status)}
                {student.status}
              </span>
            )}
          </div>
        </div>
        <button
          className="view-btn"
          onClick={() => navigate(`/college/view-approved-student/${student._id}`)}
        >
          <FaEye />
        </button>
      </div>
    );
  };

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">
          <FaExclamationTriangle />
        </div>
        <h3>Dashboard Error</h3>
        <p>{error}</p>
        <button className="retry-btn" onClick={() => window.location.reload()}>
          <FaSyncAlt className="me-2" />
          Refresh Dashboard
        </button>
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
        <h4 className="erp-loading-text">Loading college dashboard...</h4>
        <div className="loading-progress">
          <div className="progress-bar"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <a href="/dashboard">Dashboard</a>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Overview
          </li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaUniversity />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">College Dashboard</h1>
            <p className="erp-page-subtitle">
              Real-time overview of your institution's key metrics
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => navigate("/college/profile")}
          >
            <FaEye className="erp-btn-icon" />
            <span>View College Profile</span>
          </button>
        </div>
      </div>

      {/* STATISTICS GRID */}
      <div className="stats-grid">
        <StatCard
          icon={FaUsers}
          label="Total Students"
          value={stats.totalStudents}
          color="#4CAF50"
          subtitle="Enrolled students"
        />
        <StatCard
          icon={FaChalkboardTeacher}
          label="Total Teachers"
          value={stats.totalTeachers}
          color="#2196F3"
          subtitle="Active faculty members"
        />
        <StatCard
          icon={FaLayerGroup}
          label="Total Departments"
          value={stats.totalDepartments}
          color="#FF9800"
          subtitle="Academic departments"
        />
        <StatCard
          icon={FaGraduationCap}
          label="Total Courses"
          value={stats.totalCourses}
          color="#9C27B0"
          subtitle="Active courses"
        />
        <StatCard
          icon={FaUserCheck}
          label="Pending Admissions"
          value={stats.pendingAdmissions}
          color="#F44336"
          subtitle="Awaiting approval"
        />
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="main-content-grid">
        {/* LEFT COLUMN - ACTIVITIES & ACTIONS */}
        <div className="left-column">
          {/* QUICK ACTIONS */}
          <div className="section-card">
            <div className="section-header">
              <h3>
                <FaArrowRight className="section-icon" />
                Quick Actions
              </h3>
              <span className="section-subtitle">
                Frequently used operations
              </span>
            </div>
            <div className="quick-actions-grid">
              {quickActions.map((action) => (
                <QuickActionCard
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  color={action.color}
                  path={action.path}
                />
              ))}
            </div>
          </div>

          {/* RECENT STUDENT ACTIVITIES */}
          <div className="section-card">
            <div className="section-header">
              <h3>
                <FaClock className="section-icon" />
                Recent Student Activities
              </h3>
              <span className="section-subtitle">
                Latest student applications
              </span>
            </div>

            <div className="activities-container">
              {recentStudents.length > 0 ? (
                recentStudents
                  .slice(0, 5)
                  .map((student) => (
                    <StudentItem key={student._id} student={student} />
                  ))
              ) : (
                <div className="empty-state">
                  <FaUsers className="empty-icon" />
                  <p>No recent student activities</p>
                </div>
              )}

              {recentStudents.length > 5 && (
                <button
                  className="view-all-btn"
                  onClick={() => navigate("/students")}
                >
                  View All Students
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - PENDING ADMISSIONS */}
        <div className="right-column">
          {/* PENDING ADMISSIONS */}
          <div className="section-card pending-admissions-card">
            <div className="section-header">
              <h3>
                <FaUserCheck className="section-icon" />
                Pending Admissions
              </h3>
              <span className="section-subtitle">
                {pendingAdmissions.length} student
                {pendingAdmissions.length !== 1 ? "s" : ""} awaiting approval
              </span>
            </div>
            <div className="pending-container">
              {pendingAdmissions.length > 0 ? (
                <>
                  <div className="pending-list">
                    {pendingAdmissions.map((student) => (
                      <StudentItem
                        key={student._id}
                        student={student}
                        isPending={true}
                      />
                    ))}
                  </div>
                  <button
                    className="approve-btn"
                    onClick={() => navigate("/students")}
                  >
                    <FaCheckCircle className="me-2" />
                    Approve Pending Students
                  </button>
                </>
              ) : (
                <div className="empty-state">
                  <FaCheckCircle className="empty-icon success" />
                  <p className="success-text">No pending admissions</p>
                  <p>All student applications have been processed</p>
                </div>
              )}
            </div>
          </div>

          {/* SYSTEM STATUS */}
          <div className="section-card">
            <div className="section-header">
              <h3>
                <FaAward className="section-icon" />
                System Status
              </h3>
            </div>
            <div className="system-status">
              <div className="status-item">
                <div className="status-indicator online"></div>
                <div className="status-info">
                  <div className="status-title">Database</div>
                  <div className="status-detail">Operational</div>
                </div>
              </div>
              <div className="status-item">
                <div className="status-indicator online"></div>
                <div className="status-info">
                  <div className="status-title">Authentication</div>
                  <div className="status-detail">Secure & Active</div>
                </div>
              </div>
              <div className="status-item">
                <div className="status-indicator online"></div>
                <div className="status-info">
                  <div className="status-title">File Storage</div>
                  <div className="status-detail">Available</div>
                </div>
              </div>
              <div className="status-item">
                <div className="status-indicator maintenance"></div>
                <div className="status-info">
                  <div className="status-title">Reports Module</div>
                  <div className="status-detail">Scheduled maintenance</div>
                </div>
              </div>
            </div>
          </div>
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
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
          border-left: 4px solid;
          transition: all 0.3s ease;
          border-color: #e9ecef;
        }

        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        }

        .stat-icon {
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

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: 0.95rem;
          color: #666;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1a4b6d;
          line-height: 1;
        }

        .stat-subtitle {
          font-size: 0.85rem;
          color: #777;
          margin-top: 0.25rem;
        }

        /* MAIN CONTENT GRID */
        .main-content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        .left-column,
        .right-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .section-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .section-card:hover {
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
        }

        .section-header {
          padding: 1.5rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #eaeaea;
        }

        .section-header h3 {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
          color: #1a4b6d;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-icon {
          color: #1a4b6d;
          font-size: 1.25rem;
        }

        .section-subtitle {
          font-size: 0.9rem;
          color: #6c757d;
          margin-left: 2.25rem;
          margin-top: 0.25rem;
          display: block;
        }

        /* QUICK ACTIONS */
        .quick-actions-grid {
          padding: 1.25rem 1.5rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
        }

        .quick-action-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
          padding: 1.1rem;
          border-radius: 14px;
          border: 2px solid transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
          min-height: 120px;
        }

        .quick-action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          border-color: #1a4b6d;
        }

        .quick-action-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          font-size: 1.4rem;
        }

        .quick-action-label {
          font-weight: 600;
          color: #1a4b6d;
          font-size: 0.95rem;
          line-height: 1.3;
        }

        .quick-action-arrow {
          color: #1a4b6d;
          opacity: 0;
          transition: all 0.3s ease;
          margin-top: 0.25rem;
        }

        .quick-action-card:hover .quick-action-arrow {
          opacity: 1;
          transform: translateX(3px);
        }

        /* ACTIVITIES CONTAINER */
        .activities-container,
        .pending-container {
          padding: 0 1.5rem 1.5rem;
        }

        .student-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 12px;
          background: #f9fafc;
          margin-bottom: 0.75rem;
          transition: all 0.25s ease;
          border: 1px solid #edf0f5;
        }

        .student-item:hover {
          background: #f0f5ff;
          border-color: #d4e1ff;
          transform: translateX(3px);
        }

        .student-avatar {
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
        }

        .student-details {
          flex: 1;
        }

        .student-name {
          font-weight: 600;
          color: #1a4b6d;
          margin-bottom: 0.25rem;
          font-size: 0.95rem;
        }

        .student-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .status-badge.pending {
          background: rgba(255, 152, 0, 0.15);
          color: #e68a00;
        }

        .status-icon {
          font-size: 0.8rem;
        }

        .view-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .view-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(26, 75, 109, 0.3);
        }

        .empty-state {
          text-align: center;
          padding: 2.5rem 1.5rem;
          color: #777;
        }

        .empty-icon {
          font-size: 3.5rem;
          color: #e9ecef;
          margin-bottom: 1rem;
          opacity: 0.7;
        }

        .empty-icon.success {
          color: #4caf50;
          opacity: 0.9;
        }

        .success-text {
          font-weight: 600;
          color: #4caf50;
          margin: 0.5rem 0;
        }

        .view-all-btn,
        .approve-btn {
          width: 100%;
          padding: 0.85rem;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .view-all-btn:hover,
        .approve-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(26, 75, 109, 0.4);
        }

        .approve-btn {
          background: linear-gradient(135deg, #4caf50 0%, #43a047 100%);
          margin-top: 1.5rem;
        }

        .approve-btn:hover {
          box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
        }

        /* PENDING ADMISSIONS CARD */
        .pending-admissions-card {
          grid-row: span 2;
        }

        .pending-list {
          max-height: 300px;
          overflow-y: auto;
          padding-right: 8px;
        }

        .pending-list::-webkit-scrollbar {
          width: 6px;
        }

        .pending-list::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .pending-list::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }

        .pending-list::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        /* SYSTEM STATUS */
        .system-status {
          padding: 1.25rem 1.5rem;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 0;
          border-bottom: 1px solid #f0f2f5;
        }

        .status-item:last-child {
          border-bottom: none;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-indicator.online {
          background: #4caf50;
          box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
        }

        .status-indicator.maintenance {
          background: #ff9800;
          box-shadow: 0 0 8px rgba(255, 152, 0, 0.6);
        }

        .status-info {
          flex: 1;
        }

        .status-title {
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.95rem;
        }

        .status-detail {
          font-size: 0.85rem;
          color: #6c757d;
        }

        /* ERROR CONTAINER */
        .error-container {
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

        .error-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(244, 67, 54, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: #f44336;
          font-size: 3rem;
        }

        .error-container h3 {
          font-size: 1.8rem;
          color: #1a4b6d;
          margin-bottom: 1rem;
        }

        .error-container p {
          color: #666;
          font-size: 1.1rem;
          max-width: 600px;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .retry-btn {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          border: none;
          padding: 0.85rem 2rem;
          border-radius: 12px;
          font-size: 1.05rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(26, 75, 109, 0.4);
        }

        .retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.5);
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
          width: 70px;
          height: 70px;
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
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #1a4b6d 0%, #0f3a4a 100%);
          width: 35%;
          animation: progressPulse 1.8s ease-in-out infinite;
        }

        /* ANIMATIONS */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes progressPulse {
          0%,
          100% {
            width: 35%;
          }
          50% {
            width: 65%;
          }
        }

        /* RESPONSIVE DESIGN */
        @media (max-width: 1100px) {
          .main-content-grid {
            grid-template-columns: 1fr;
          }

          .pending-admissions-card {
            grid-row: auto;
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

          .stat-value {
            font-size: 1.75rem;
          }

          .quick-actions-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          }

          .quick-action-card {
            min-height: 100px;
            padding: 0.85rem;
          }

          .section-header h3 {
            font-size: 1.25rem;
          }

          .section-subtitle {
            font-size: 0.85rem;
            margin-left: 2rem;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .quick-actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .student-item {
            flex-direction: column;
            align-items: flex-start;
            padding: 1rem;
          }

          .student-meta {
            width: 100%;
            justify-content: space-between;
          }

          .view-btn {
            align-self: flex-end;
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

/* CUSTOM ICONS */
const FaSyncAlt = ({ size = 16, color = "#1a4b6d" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);
