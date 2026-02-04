import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUniversity,
  FaLayerGroup,
  FaUserGraduate,
  FaClipboardList,
  FaArrowRight,
  FaBolt,
  FaUser,
  FaCog,
  FaBell,
  FaChartBar,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaChalkboardTeacher,
  FaBookOpen,
  FaGraduationCap,
  FaFileInvoice,
  FaTasks,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaEye,
  FaDownload,
  FaPrint,
  FaSync,
  FaArrowLeft,
  FaStar,
  FaShieldAlt,
  FaTimesCircle,
  FaSpinner,
} from "react-icons/fa";

export default function CollegeAdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalDepartments: 0,
    totalCourses: 0,
    pendingAdmissions: 0,
  });

  const [recentStudents, setRecentStudents] = useState([]);
  const [pendingAdmissions, setPendingAdmissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH DASHBOARD DATA ================= */
  const fetchDashboardData = async () => {
    try {
      const response = await api.get("/dashboard/college-admin");
      const data = response.data;

      if (data && data.stats) {
        setStats(data.stats);
        setRecentStudents(data.recentStudents || []);
        setPendingAdmissions(data.pendingAdmissions || []);
        setError("");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load dashboard data. Please try again.",
      );
      // Set mock data for better UX on error
      setStats({
        totalStudents: 15,
        totalTeachers: 7,
        totalDepartments: 4,
        totalCourses: 8,
        pendingAdmissions: 1,
      });
      setRecentStudents([
        { _id: "1", fullName: "Sandesh Patil", status: "REJECTED" },
        { _id: "2", fullName: "Seetarani Pawar", status: "APPROVED" },
        { _id: "3", fullName: "Seeta Pawar", status: "REJECTED" },
        { _id: "4", fullName: "Sharad Patil", status: "APPROVED" },
      ]);
      setPendingAdmissions([{ _id: "5", fullName: "John Don" }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  /* ================= MOCK DATA (for fields not in API) ================= */
  const mockData = {
    attendance: "87%",
    feeCollection: "₹24,50,000",
    activeSessions: 3,
    quickActions: [
      {
        icon: <FaUniversity />,
        label: "Departments",
        path: "/departments",
        color: "primary",
      },
      {
        icon: <FaLayerGroup />,
        label: "Courses",
        path: "/courses",
        color: "success",
      },
      {
        icon: <FaUserGraduate />,
        label: "Students",
        path: "/students",
        color: "info",
      },
      {
        icon: <FaChalkboardTeacher />,
        label: "Teachers",
        path: "/teachers",
        color: "warning",
      },
      {
        icon: <FaClipboardList />,
        label: "Attendance",
        path: "/attendance/report",
        color: "secondary",
      },
      {
        icon: <FaMoneyBillWave />,
        label: "Fee Structures",
        path: "/fees/list",
        color: "danger",
      },
      {
        icon: <FaCalendarAlt />,
        label: "Timetable",
        path: "/timetable/view",
        color: "dark",
      },
      {
        icon: <FaCog />,
        label: "Settings",
        path: "/college/profile",
        color: "light",
      },
    ],
  };

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-5 text-center">
                <div
                  className="spinner-border text-primary mb-3"
                  role="status"
                  style={{ width: "3rem", height: "3rem" }}
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="text-muted">Loading College Dashboard...</h5>
                <p className="text-muted small">
                  Fetching latest college statistics
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body text-center p-5">
                <div className="text-danger mb-3">
                  <FaTimesCircle size={64} />
                </div>
                <h4 className="fw-bold mb-2">Error Loading Dashboard</h4>
                <p className="text-muted mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2 mx-auto"
                >
                  <FaSync className="spin-icon" /> Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3 py-md-4 animate-fade-in">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-3 mb-md-4 animate-slide-down">
        <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
          <div className="dashboard-logo-container bg-gradient-primary text-white rounded-circle d-flex align-items-center justify-content-center pulse-icon">
            <FaUniversity size={28} />
          </div>
          <div>
            <h1 className="h4 h3-md fw-bold mb-1 text-dark">
              College Admin Dashboard
            </h1>
            <p className="text-muted mb-0 small">
              <FaChartBar className="me-1" />
              Real-time overview of college operations
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="btn btn-outline-info d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Dashboard Help"
          >
            <FaInfoCircle size={16} /> Help
          </button>

          <button
            onClick={() => navigate("/college/profile")}
            className="btn btn-outline-primary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="View College Profile"
          >
            <FaUser size={16} /> Profile
          </button>
        </div>
      </div>

      {/* ================= HELP SECTION ================= */}
      {showHelp && (
        <div className="alert alert-info border-0 bg-info bg-opacity-10 rounded-4 mb-3 mb-md-4 animate-fade-in">
          <div className="d-flex align-items-start gap-2">
            <FaInfoCircle className="mt-1 flex-shrink-0" size={20} />
            <div>
              <h6 className="fw-bold mb-1">Dashboard Guide</h6>
              <ul className="mb-0 small ps-3">
                <li>
                  <strong>Stat Cards</strong>: Real-time counts of students,
                  teachers, departments, courses, and pending admissions
                </li>
                <li>
                  <strong>Recent Students</strong>: Latest student registrations
                  with approval status
                </li>
                <li>
                  <strong>Pending Admissions</strong>: Students awaiting
                  approval (click to review)
                </li>
                <li>
                  <strong>Quick Actions</strong>: One-click access to frequently
                  used features
                </li>
                <li>Click any stat card to navigate to the detailed view</li>
                <li>Refresh button updates all data from server</li>
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

      {/* ================= STAT CARDS GRID ================= */}
      <div className="row g-3 g-md-4 mb-3 mb-md-4 animate-fade-in-up">
        <StatCard
          icon={<FaUserGraduate className="blink-fast" />}
          title="Total Students"
          value={stats.totalStudents}
          link="/students"
          gradient={["#73bef4", "#0a3647"]}
          trend={`+${Math.floor(stats.totalStudents * 0.1)} this month`}
          trendColor="text-violet-300"
        />
        <StatCard
          icon={<FaChalkboardTeacher />}
          title="Total Teachers"
          value={stats.totalTeachers}
          link="/teachers"
          gradient={["#73bef4", "#0a3647"]}
          trend="Faculty strength"
          trendColor="text-violet-300"
        />
        <StatCard
          icon={<FaUniversity className="blink-slow" />}
          title="Departments"
          value={stats.totalDepartments}
          link="/departments"
          gradient={["#73bef4", "#0a3647"]}
          trend={`+${Math.floor(stats.totalDepartments * 0.2)} new`}
          trendColor="text-violet-300"
        />
        <StatCard
          icon={<FaLayerGroup className="blink" />}
          title="Active Courses"
          value={stats.totalCourses}
          link="/courses"
          gradient={["#73bef4", "#0a3647"]}
          trend={`+${Math.floor(stats.totalCourses * 0.15)} courses`}
          trendColor="text-violet-300"
        />
        <StatCard
          icon={<FaClipboardList />}
          title="Avg. Attendance"
          value={mockData.attendance}
          link="/attendance/report"
          gradient={["#7ab3f0", "#0a1d37"]}
          trend="+3% this week"
          trendColor="text-violet-100"
        />
        <StatCard
          icon={<FaMoneyBillWave />}
          title="Fee Collection"
          value={mockData.feeCollection}
          link="/fees/list"
          gradient={["#73bef4", "#0a3647"]}
          trend="+₹1.2L this month"
          trendColor="text-violet-300"
        />
        <StatCard
          icon={<FaCalendarAlt />}
          title="Active Sessions"
          value={mockData.activeSessions}
          link="/timetable/view"
          gradient={["#73bef4", "#0a3647"]}
          trend="Current semester"
          trendColor="text-violet-300"
        />
        <StatCard
          icon={<FaTasks />}
          title="Pending Approvals"
          value={stats.pendingAdmissions}
          link="/students/approve"
          gradient={["#73bef4", "#0a3647"]}
          trend="Action required"
          trendColor="text-violet-300"
          highlight={stats.pendingAdmissions > 0}
        />
      </div>

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="row g-3 g-md-4">
        {/* LEFT COLUMN - RECENT STUDENTS & QUICK ACTIONS */}
        <div className="col-lg-8">
          {/* ================= RECENT STUDENTS CARD ================= */}
          <div
            className="card border-0 shadow-lg rounded-4 overflow-hidden mb-3 mb-md-4 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="card-header bg-gradient-info text-white py-3 py-md-4">
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="h5 h6-md fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaUserGraduate /> Recent Student Activity
                </h2>
                <LinkButton
                  to="/students"
                  label="View All"
                  icon={<FaArrowRight size={12} />}
                />
              </div>
            </div>
            <div className="card-body p-3 p-md-4">
              {recentStudents.length === 0 ? (
                <div className="text-center py-4">
                  <FaUserGraduate className="text-muted mb-2" size={48} />
                  <p className="text-muted mb-0">No recent student activity</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th width="50%">Student Name</th>
                        <th width="30%">Status</th>
                        <th width="20%" className="text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentStudents.map((student, idx) => (
                        <tr
                          key={student._id}
                          className="animate-fade-in"
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          <td className="fw-semibold">{student.fullName}</td>
                          <td>
                            <span
                              className={`badge ${
                                student.status === "APPROVED"
                                  ? "bg-success"
                                  : student.status === "REJECTED"
                                    ? "bg-danger"
                                    : "bg-warning"
                              }`}
                            >
                              {student.status === "APPROVED" && (
                                <FaCheckCircle className="me-1" />
                              )}
                              {student.status === "REJECTED" && (
                                <FaTimesCircle className="me-1" />
                              )}
                              {student.status}
                            </span>
                          </td>
                          <td className="text-center">
                            <LinkButton
                              to={`/college/view-approved-student/${student._id}`}
                              label={<FaEye size={14} />}
                              small
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ================= QUICK ACTIONS CARD ================= */}
          <div
            className="card border-0 shadow-lg rounded-4 overflow-hidden animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="card-header bg-gradient-primary text-white py-3 py-md-4">
              <h2 className="h5 h6-md fw-bold mb-0 d-flex align-items-center gap-2">
                <FaBolt /> Quick Actions
              </h2>
            </div>
            <div className="card-body p-3 p-md-4">
              <div className="row g-2 g-md-3">
                {mockData.quickActions.map((action, idx) => (
                  <div className="col-6 col-md-4 col-lg-3" key={idx}>
                    <LinkButton
                      to={action.path}
                      label={action.label}
                      icon={action.icon}
                      color={action.color}
                      fullWidth
                      className="animate-fade-in"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - PENDING ADMISSIONS & ANNOUNCEMENTS */}
        <div className="col-lg-4">
          <div className="sticky-top" style={{ top: "15px" }}>
            {/* ================= PENDING ADMISSIONS CARD ================= */}
            <div
              className="card border-0 shadow-lg rounded-4 overflow-hidden mb-3 mb-md-4 animate-fade-in-up"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="card-header bg-gradient-warning text-white py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                    <FaTasks /> Pending Admissions
                    <span className="badge bg-dark">
                      {pendingAdmissions.length}
                    </span>
                  </h2>
                  <LinkButton
                    to="/students/approve"
                    label="Approve"
                    icon={<FaArrowRight size={12} />}
                    small
                  />
                </div>
              </div>
              <div className="card-body p-3">
                {pendingAdmissions.length === 0 ? (
                  <div className="text-center py-3">
                    <FaCheckCircle className="text-success mb-2" size={32} />
                    <p className="text-muted mb-0 small">
                      No pending admissions
                    </p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {pendingAdmissions.map((student, idx) => (
                      <div
                        key={student._id}
                        className="list-group-item d-flex align-items-center justify-content-between px-2 py-2 animate-fade-in"
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-shrink-0 p-2 rounded-circle bg-warning bg-opacity-10">
                            <FaUserGraduate className="text-warning" />
                          </div>
                          <div>
                            <h6 className="fw-semibold mb-0 small">
                              {student.fullName}
                            </h6>
                            <small className="text-muted">
                              Awaiting approval
                            </small>
                          </div>
                        </div>
                        <LinkButton
                          to={`/students/approve`}
                          label="Review"
                          small
                          className="btn-warning"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ================= SYSTEM INFO CARD ================= */}
            <div
              className="card border-0 shadow-lg rounded-4 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: "0.25s" }}
            >
              <div className="card-header bg-gradient-dark text-white py-3">
                <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaInfoCircle /> System Info
                </h2>
              </div>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="text-muted small">System Version</span>
                  <span className="badge bg-primary">v2.1.0</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="text-muted small">Last Updated</span>
                  <span className="fw-semibold small">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div
        className="card border-0 shadow-lg rounded-4 overflow-hidden mt-3 mt-md-4 animate-fade-in-up"
        style={{ animationDelay: "0.3s" }}
      >
        <div className="card-body p-3 p-md-4 bg-light">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-center text-md-start">
              <p className="mb-1">
                <small className="text-muted">
                  <FaUniversity className="me-1" />
                  NOVAA | College Admin Dashboard
                </small>
              </p>
              <p className="mb-0">
                <small className="text-muted">
                  <FaSync className="spin-icon me-1" />
                  Last Sync: <strong>{new Date().toLocaleString()}</strong>
                </small>
              </p>
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
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.5s ease-out forwards; }
        .animate-fade-in-up { animation: slideUp 0.6s ease-out forwards; }
        .pulse-icon { animation: pulse 2s infinite; }
        .blink { animation: blink 1.5s infinite; }
        .blink-slow { animation: blink 2.5s infinite; }
        .blink-fast { animation: blink 0.9s infinite; }
        .hover-lift:hover { animation: lift 0.3s ease forwards; }
        .spin-icon { animation: spin 1s linear infinite; }
        .float-badge { animation: float 3s ease-in-out infinite; }

        .bg-gradient-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }
        .bg-gradient-success {
          background: linear-gradient(135deg, #1e6f5c 0%, #155447 100%);
        }
        .bg-gradient-info {
          background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
        }
        .bg-gradient-warning {
          background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
        }
        .bg-gradient-dark {
          background: linear-gradient(135deg, #343a40 0%, #23272b 100%);
        }

        .dashboard-logo-container {
          width: 60px;
          height: 60px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        /* ================= STAT CARDS ================= */
        .stat-card {
          transition: all 0.3s ease;
          border-radius: 1.25rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          height: 100%;
          border: none;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 5px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: shine 2s infinite;
        }
        .stat-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
        }
        .stat-card.highlight {
          box-shadow: 0 0 25px rgba(255, 193, 7, 0.6);
          border: 2px solid #ffc107;
        }
        .stat-card.highlight::before {
          background: linear-gradient(90deg, transparent, #ffc107, transparent);
        }

        .stat-card .card-body {
          padding: 1.5rem;
          position: relative;
          z-index: 2;
        }

        .stat-card .fs-3 {
          font-size: 2.5rem;
          color: white;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .stat-card h6 {
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .stat-card h2 {
          font-size: 2.2rem;
          font-weight: 700;
          color: white;
          margin: 0.5rem 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .stat-card small {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }

        .stat-card .trend-indicator {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          margin-right: 4px;
          animation: pulse 2s infinite;
        }

        /* ================= TABLE ================= */
        .table thead th {
          font-weight: 600;
          color: #495057;
          font-size: 0.9rem;
        }
        .table td {
          font-size: 0.95rem;
          color: #212529;
        }
        .table .badge {
          font-size: 0.85rem;
          padding: 0.4rem 0.75rem;
        }

        /* ================= LIST ITEMS ================= */
        .list-group-item {
          border: 1px solid #e9ecef;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          transition: all 0.2s ease;
          background: white;
          margin-bottom: 0.5rem;
        }
        .list-group-item:hover {
          transform: translateX(5px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
          background-color: #f8f9fa;
        }

        /* ================= RESPONSIVE STYLES ================= */
        @media (max-width: 992px) {
          .sticky-top {
            position: static !important;
          }
          .dashboard-logo-container {
            width: 50px;
            height: 50px;
          }
          .h3-md {
            font-size: 1.5rem !important;
          }
          .h5 {
            font-size: 1.1rem !important;
          }
          .h6-md {
            font-size: 1rem !important;
          }
        }

        @media (max-width: 768px) {
          .col-6.col-md-4.col-lg-3 {
            flex: 0 0 50%;
            max-width: 50%;
          }
          .btn-sm {
            padding: 0.25rem 0.5rem !important;
            font-size: 0.75rem !important;
          }
        }

        @media (max-width: 576px) {
          .col-6.col-md-4.col-lg-3 {
            flex: 0 0 100%;
            max-width: 100%;
          }
          .dashboard-logo-container {
            width: 45px;
            height: 45px;
          }
          .stat-card .fs-3 {
            font-size: 2rem;
          }
          .stat-card h2 {
            font-size: 1.8rem;
          }
          .btn-sm {
            padding: 0.2rem 0.4rem !important;
            font-size: 0.7rem !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ================= LINK BUTTON COMPONENT ================= */
function LinkButton({
  to,
  label,
  icon,
  color = "dark",
  small = false,
  fullWidth = false,
  className = "",
}) {
  const navigate = useNavigate();

  const baseClasses = `btn d-flex align-items-center gap-1 ${className}`;
  const sizeClasses = small ? "btn-sm px-2 py-1" : "btn px-3 py-2";
  const colorClasses =
    color === "light"
      ? "btn-outline-dark"
      : `btn-outline-${color} text-${color} hover-lift`;
  const widthClasses = fullWidth ? "w-100" : "";

  return (
    <button
      onClick={() => navigate(to)}
      className={`${baseClasses} ${sizeClasses} ${colorClasses} ${widthClasses}`}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

/* ================= STAT CARD COMPONENT ================= */
function StatCard({
  icon,
  title,
  value,
  link,
  gradient,
  trend,
  trendColor,
  highlight = false,
}) {
  const navigate = useNavigate();

  return (
    <div className="col-6 col-md-4 col-lg-3 mb-3">
      <div
        className={`card h-100 border-0 stat-card animate-fade-in-up ${highlight ? "highlight" : ""}`}
        style={{
          background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]}), radial-gradient(circle at 10% 20%, rgba(255,255,255,0.1) 0%, transparent 30%)`,
          backgroundBlendMode: "overlay",
          cursor: "pointer",
        }}
        onClick={() => navigate(link)}
      >
        <div className="card-body text-center p-4">
          <div className="fs-3 mb-3">{icon}</div>
          <h6 className="mb-1">{title}</h6>
          <h2 className="mb-2">{value}</h2>
          {trend && (
            <small className={`d-block fw-medium ${trendColor}`}>
              <span className="trend-indicator" />
              {trend}
            </small>
          )}
          <div className="mt-3 pt-3 border-top border-white-25">
            <small className="text-white-75 d-flex align-items-center justify-content-center gap-1">
              <span>View details</span>
              <FaArrowRight size={10} />
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
