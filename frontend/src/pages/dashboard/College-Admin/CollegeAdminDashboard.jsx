import { useContext, useState, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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
  FaSpinner,
  FaTimesCircle,
  FaCheck,
  FaHourglassHalf
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
    pendingAdmissions: 0
  });
  
  const [recentStudents, setRecentStudents] = useState([]);
  const [pendingAdmissions, setPendingAdmissions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= HARD SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role === "SUPER_ADMIN")
    return <Navigate to="/super-admin/dashboard" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/login" />;

  /* ================= FETCH DASHBOARD DATA ================= */
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get("/dashboard/college-admin");
        const data = response.data;
        
        setStats(data.stats || {
          totalStudents: 0,
          totalTeachers: 0,
          totalDepartments: 0,
          totalCourses: 0,
          pendingAdmissions: 0
        });
        
        setRecentStudents(data.recentStudents || []);
        setPendingAdmissions(data.pendingAdmissions || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  /* ================= MOCK DATA (for fields not in API) ================= */
  const mockData = {
    attendance: "87%",
    feeCollection: "₹24,50,000",
    activeSessions: 3,
    announcements: [
      { id: 1, type: "info", title: "New Feature", message: "Fee structure management is now live!" },
      { id: 2, type: "warning", title: "Reminder", message: `Student approval pending for ${stats.pendingAdmissions} students` },
      { id: 3, type: "success", title: "Update", message: "Timetable for next semester published" }
    ],
    quickActions: [
      { icon: <FaUniversity />, label: "Departments", path: "/departments", color: "primary" },
      { icon: <FaLayerGroup />, label: "Courses", path: "/courses", color: "success" },
      { icon: <FaUserGraduate />, label: "Students", path: "/students", color: "info" },
      { icon: <FaChalkboardTeacher />, label: "Teachers", path: "/teachers", color: "warning" },
      { icon: <FaClipboardList />, label: "Attendance", path: "/attendance/report", color: "secondary" },
      { icon: <FaMoneyBillWave />, label: "Fee Structures", path: "/fees/list", color: "danger" },
      { icon: <FaCalendarAlt />, label: "Timetable", path: "/timetable/view", color: "dark" },
      { icon: <FaCog />, label: "Settings", path: "/college/profile", color: "light" }
    ]
  };

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Dashboard...</h5>
          <p className="text-muted small">Fetching latest college statistics</p>
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
            <h1 className="h4 h3-md fw-bold mb-1 text-dark">College Admin Dashboard</h1>
            <p className="text-muted mb-0 small">
              <FaChartBar className="me-1" />
              Real-time overview of college operations
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button 
            onClick={() => navigate("/college/profile")}
            className="btn btn-outline-primary d-flex align-items-center gap-2 px-3 px-md-4 py-2 hover-lift"
            title="View College Profile"
          >
            <FaUser size={16} /> Profile
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 px-md-4 py-2 hover-lift"
            title="Refresh Dashboard"
          >
            <FaSync className="spin-icon" size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* ================= STAT CARDS GRID ================= */}
      <div className="row g-3 g-md-4 mb-3 mb-md-4 animate-fade-in-up">
        <StatCard
          icon={<FaUserGraduate className="blink-fast" />}
          title="Total Students"
          value={stats.totalStudents}
          link="/students"
          color="info"
          trend={`+${Math.floor(stats.totalStudents * 0.1)} this month`}
        />
        <StatCard
          icon={<FaChalkboardTeacher />}
          title="Total Teachers"
          value={stats.totalTeachers}
          link="/teachers"
          color="warning"
          trend="Faculty strength"
        />
        <StatCard
          icon={<FaUniversity className="blink-slow" />}
          title="Departments"
          value={stats.totalDepartments}
          link="/departments"
          color="primary"
          trend={`+${Math.floor(stats.totalDepartments * 0.2)} new`}
        />
        <StatCard
          icon={<FaLayerGroup className="blink" />}
          title="Active Courses"
          value={stats.totalCourses}
          link="/courses"
          color="success"
          trend={`+${Math.floor(stats.totalCourses * 0.15)} courses`}
        />
        <StatCard
          icon={<FaClipboardList />}
          title="Avg. Attendance"
          value={mockData.attendance}
          link="/attendance/report"
          color="secondary"
          trend="+3% this week"
        />
        <StatCard
          icon={<FaMoneyBillWave />}
          title="Fee Collection"
          value={mockData.feeCollection}
          link="/fees/list"
          color="danger"
          trend="+₹1.2L this month"
        />
        <StatCard
          icon={<FaCalendarAlt />}
          title="Active Sessions"
          value={mockData.activeSessions}
          link="/timetable/view"
          color="dark"
          trend="Current semester"
        />
        <StatCard
          icon={<FaTasks />}
          title="Pending Approvals"
          value={stats.pendingAdmissions}
          link="/students/approve"
          color="warning"
          trend="Action required"
          highlight={stats.pendingAdmissions > 0}
        />
      </div>

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="row g-3 g-md-4">
        {/* LEFT COLUMN - RECENT STUDENTS & QUICK ACTIONS */}
        <div className="col-lg-8">
          {/* ================= RECENT STUDENTS CARD ================= */}
          <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-3 mb-md-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="card-header bg-gradient-info text-white py-3 py-md-4">
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="h5 h6-md fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaUserGraduate /> Recent Student Activity
                </h2>
                <Link to="/students" className="btn btn-sm btn-light d-flex align-items-center gap-1">
                  View All <FaArrowRight size={12} />
                </Link>
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
                        <th width="20%" className="text-center">Action</th>
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
                            <span className={`badge ${
                              student.status === "APPROVED" ? "bg-success" :
                              student.status === "REJECTED" ? "bg-danger" :
                              "bg-warning"
                            }`}>
                              {student.status === "APPROVED" && <FaCheck className="me-1" />}
                              {student.status === "REJECTED" && <FaTimesCircle className="me-1" />}
                              {student.status === "PENDING" && <FaHourglassHalf className="me-1" />}
                              {student.status}
                            </span>
                          </td>
                          <td className="text-center">
                            <Link 
                              to={`/students/view/${student._id}`} 
                              className="btn btn-sm btn-outline-primary"
                            >
                              <FaEye />
                            </Link>
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
          <div className="card border-0 shadow-lg rounded-4 overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="card-header bg-gradient-primary text-white py-3 py-md-4">
              <h2 className="h5 h6-md fw-bold mb-0 d-flex align-items-center gap-2">
                <FaBolt /> Quick Actions
              </h2>
            </div>
            <div className="card-body p-3 p-md-4">
              <div className="row g-2 g-md-3">
                {mockData.quickActions.map((action, idx) => (
                  <div className="col-6 col-md-4 col-lg-3" key={idx}>
                    <Link
                      to={action.path}
                      className={`btn w-100 d-flex flex-column align-items-center gap-2 py-2 py-md-3 rounded-3 shadow-sm text-decoration-none text-${action.color} border border-${action.color} hover-lift animate-fade-in`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className={`fs-4 mb-1`}>{action.icon}</div>
                      <span className="fw-semibold small">{action.label}</span>
                    </Link>
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
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-3 mb-md-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
              <div className="card-header bg-gradient-warning text-white py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                    <FaHourglassHalf /> Pending Admissions
                    <span className="badge bg-dark">{pendingAdmissions.length}</span>
                  </h2>
                  <Link to="/students/approve" className="btn btn-sm btn-dark d-flex align-items-center gap-1">
                    Approve <FaArrowRight size={12} />
                  </Link>
                </div>
              </div>
              <div className="card-body p-3">
                {pendingAdmissions.length === 0 ? (
                  <div className="text-center py-3">
                    <FaCheckCircle className="text-success mb-2" size={32} />
                    <p className="text-muted mb-0 small">No pending admissions</p>
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
                            <h6 className="fw-semibold mb-0 small">{student.fullName}</h6>
                            <small className="text-muted">Awaiting approval</small>
                          </div>
                        </div>
                        <Link 
                          to={`/students/approve`} 
                          className="btn btn-sm btn-warning"
                        >
                          Review
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ================= ANNOUNCEMENTS CARD ================= */}
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-3 mb-md-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <div className="card-header bg-gradient-info text-white py-3">
                <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaBell /> Announcements
                </h2>
              </div>
              <div className="card-body p-3">
                {mockData.announcements.map((ann, idx) => (
                  <div 
                    key={idx} 
                    className={`alert alert-${ann.type} border-0 mb-3 animate-fade-in`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="d-flex align-items-start gap-2">
                      <div className="flex-shrink-0 mt-1">
                        {ann.type === "info" && <FaInfoCircle className={`text-${ann.type}`} size={18} />}
                        {ann.type === "warning" && <FaExclamationTriangle className={`text-${ann.type}`} size={18} />}
                        {ann.type === "success" && <FaCheckCircle className={`text-${ann.type}`} size={18} />}
                      </div>
                      <div>
                        <h6 className={`fw-bold text-${ann.type} mb-1 small`}>{ann.title}</h6>
                        <p className="mb-0 small">{ann.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ================= SYSTEM INFO CARD ================= */}
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
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
                  <span className="fw-semibold small">{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                  <span className="text-muted small">College Code</span>
                  <span className="fw-semibold small">{user?.college_id || 'N/A'}</span>
                </div>
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2 py-2"
                    onClick={() => window.location.reload()}
                  >
                    <FaSync className="spin-icon" /> Refresh Data
                  </button>
                  <button 
                    className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2 py-2"
                    onClick={() => navigate("/college/profile")}
                  >
                    <FaEye /> View College Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mt-3 mt-md-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        <div className="card-body p-3 p-md-4 bg-light">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-center text-md-start">
              <p className="mb-1">
                <small className="text-muted">
                  <FaUniversity className="me-1" />
                  Smart College ERP System | College Admin Dashboard
                </small>
              </p>
              <p className="mb-0">
                <small className="text-muted">
                  <FaSync className="spin-icon me-1" />
                  Last Sync: <strong>{new Date().toLocaleString()}</strong>
                </small>
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
                <FaDownload size={12} /> Export
              </button>
              <button className="btn btn-sm btn-outline-info d-flex align-items-center gap-1">
                <FaPrint size={12} /> Print
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
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
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

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .dashboard-logo-container {
          width: 60px;
          height: 60px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        .stat-card {
          transition: all 0.3s ease;
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: shine 2s infinite;
        }
        .stat-card.highlight {
          box-shadow: 0 0 20px rgba(255, 193, 7, 0.5);
          border-color: #ffc107;
        }
        .stat-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 15px 30px rgba(0,0,0,0.2);
          border-color: rgba(0,0,0,0.1);
        }

        .table tr:hover td {
          background-color: rgba(248, 249, 250, 0.7);
        }

        .list-group-item:hover {
          background-color: rgba(0,0,0,0.03);
          transform: translateX(5px);
          transition: all 0.3s ease;
        }

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
        }
      `}</style>
    </div>
  );
}

/* ================= STAT CARD ================= */
function StatCard({ icon, title, value, link, color, trend, highlight = false }) {
  return (
    <div className="col-6 col-md-4 col-lg-3 mb-3">
      <Link to={link} className="text-decoration-none">
        <div
          className={`card h-100 border-0 shadow-lg text-white stat-card animate-fade-in-up ${highlight ? 'highlight' : ''}`}
          style={{
            background: `linear-gradient(135deg, var(--bs-${color}-rgb), var(--bs-${color}-rgb))`,
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)`
          }}
        >
          <div className="card-body text-center p-3 p-md-4">
            <div className="fs-3 mb-2 opacity-90">{icon}</div>
            <h6 className="opacity-80 mb-1 small">{title}</h6>
            <h2 className="fw-bold mb-1">{value}</h2>
            {trend && (
              <small className={`fw-semibold d-block ${
                trend.includes('+') ? 'text-light' : trend.includes('-') ? 'text-danger' : 'text-light'
              }`} style={{ fontSize: '0.7rem' }}>
                {trend}
              </small>
            )}
            <div className="mt-2">
              <small className="d-flex justify-content-center align-items-center gap-1 opacity-80" style={{ fontSize: '0.7rem' }}>
                View details <FaArrowRight size={10} />
              </small>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}