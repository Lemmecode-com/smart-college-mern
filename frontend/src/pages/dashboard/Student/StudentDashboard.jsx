import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUserGraduate,
  FaUniversity,
  FaBook,
  FaCalendarAlt,
  FaMoneyCheckAlt,
  FaBell,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaInfoCircle,
  FaSync,
  FaGraduationCap,
  FaClipboardList,
  FaTasks,
  FaLightbulb,
  FaDownload,
  FaPrint,
  FaClock,
  FaFileAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaEdit,
  FaPlus
} from "react-icons/fa";

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState({
    attendanceSummary: { total: 0, present: 0, absent: 0 },
    feeSummary: { totalFee: 0, paid: 0, due: 0 }
  });
  
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= FETCH DASHBOARD DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch dashboard stats
        const dashboardRes = await api.get("/dashboard/student");
        
        // Fetch student profile (real API call)
        const profileRes = await api.get("/students/my-profile");
        
        setDashboardData(dashboardRes.data || {
          attendanceSummary: { total: 0, present: 0, absent: 0 },
          feeSummary: { totalFee: 0, paid: 0, due: 0 }
        });
        
        // Set student profile from API response
        if (profileRes.data?.student) {
          setStudentProfile(profileRes.data.student);
        } else {
          // Fallback to AuthContext data if API fails
          setStudentProfile({
            fullName: user.name || "Student",
            email: user.email || "N/A",
            department: "Computer Science",
            course: "B.Tech",
            semester: 3,
            admissionYear: 2024,
            status: "APPROVED"
          });
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        
        // Set fallback student profile from AuthContext
        setStudentProfile({
          fullName: user.name || "Student",
          email: user.email || "N/A",
          department: "Computer Science",
          course: "B.Tech",
          semester: 3,
          admissionYear: 2024,
          status: "APPROVED"
        });
        
        setError(err.response?.data?.message || "Failed to load dashboard data. Showing limited view.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  /* ================= CALCULATE METRICS ================= */
  const attendance = dashboardData.attendanceSummary;
  const fees = dashboardData.feeSummary;
  
  const attendancePercent = attendance.total > 0 
    ? Math.round((attendance.present / attendance.total) * 100)
    : 0;
    
  const feeProgress = fees.totalFee > 0
    ? Math.round((fees.paid / fees.totalFee) * 100)
    : 0;

  /* ================= STATIC DATA (READY FOR API REPLACEMENT) ================= */
  const exams = [
    { id: 1, subject: "Data Structures", date: "2026-02-15", time: "10:00 AM", venue: "Room 201", status: "upcoming" },
    { id: 2, subject: "Database Management", date: "2026-02-18", time: "2:00 PM", venue: "Lab 3", status: "upcoming" },
    { id: 3, subject: "Operating Systems", date: "2026-02-22", time: "9:00 AM", venue: "Room 105", status: "upcoming" }
  ];
  
  const assignments = [
    { id: 1, title: "Algorithm Analysis", dueDate: "2026-02-10", status: "pending", course: "CS301" },
    { id: 2, title: "SQL Queries Project", dueDate: "2026-02-12", status: "submitted", course: "DB201" },
    { id: 3, title: "OS Concepts Report", dueDate: "2026-02-14", status: "pending", course: "OS401" }
  ];
  
  const courses = [
    { id: 1, name: "Data Structures", code: "CS301", progress: 75, credits: 4 },
    { id: 2, name: "Database Management", code: "DB201", progress: 60, credits: 3 },
    { id: 3, name: "Operating Systems", code: "OS401", progress: 45, credits: 4 },
    { id: 4, name: "Computer Networks", code: "CN302", progress: 30, credits: 3 }
  ];
  
  const notifications = [
    { id: 1, type: "info", message: "📢 Mid-term exams start from 5th Feb" },
    { id: 2, type: "warning", message: "💳 Fee payment last date: 10th Feb" },
    { id: 3, type: "success", message: "📘 New assignment uploaded in Data Structures" },
    { id: 4, type: "info", message: "🏫 Library extended hours during exam week" }
  ];

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
                <h5 className="text-muted">Loading Student Dashboard...</h5>
                <p className="text-muted small">Fetching your academic information</p>
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
          <div className="col-md-8">
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
            <FaGraduationCap size={28} />
          </div>
          <div>
            <h1 className="h4 h3-md fw-bold mb-1 text-dark">Student Dashboard</h1>
            <p className="text-muted mb-0 small">
              <FaCalendarAlt className="me-1" />
              Welcome back, <strong>{studentProfile?.fullName || "Student"}</strong>
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
            onClick={() => navigate("/student/profile")}
            className="btn btn-outline-primary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="View Profile"
          >
            <FaUserGraduate size={16} /> Profile
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Refresh Dashboard"
          >
            <FaSync className="spin-icon" size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* ================= HELP SECTION ================= */}
      {showHelp && (
        <div className="alert alert-info border-0 bg-info bg-opacity-10 rounded-4 mb-3 mb-md-4 animate-fade-in">
          <div className="d-flex align-items-start gap-2">
            <FaInfoCircle className="mt-1 flex-shrink-0" size={20} />
            <div>
              <h6 className="fw-bold mb-1">Student Dashboard Guide</h6>
              <ul className="mb-0 small ps-3">
                <li><strong>Attendance & Fees</strong>: Real-time summary of your academic status</li>
                <li><strong>Upcoming Exams</strong>: Important exam dates and venues</li>
                <li><strong>Assignments</strong>: Track pending and submitted work</li>
                <li><strong>Course Progress</strong>: Visual progress bars for each course</li>
                <li>Click any section title to expand/collapse content</li>
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
          icon={<FaCalendarAlt className="blink-fast" />}
          title="Overall Attendance"
          value={`${attendancePercent}%`}
          subtitle={`${attendance.present} present / ${attendance.total} total`}
          color="primary"
          progress={attendancePercent}
          trend={attendancePercent > 75 ? "Good standing" : "Needs improvement"}
          trendColor={attendancePercent > 75 ? "text-success" : "text-warning"}
        />
        <StatCard
          icon={<FaMoneyCheckAlt />}
          title="Fee Status"
          value={`₹${fees.due.toLocaleString()}`}
          subtitle={`Due: ₹${fees.due.toLocaleString()} | Paid: ₹${fees.paid.toLocaleString()}`}
          color="danger"
          progress={feeProgress}
          trend={fees.due === 0 ? "Fully paid" : "Payment pending"}
          trendColor={fees.due === 0 ? "text-success" : "text-danger"}
        />
        <StatCard
          icon={<FaGraduationCap />}
          title="Active Courses"
          value={courses.length}
          subtitle="Current semester courses"
          color="success"
          progress={75}
          trend="+2 this semester"
        />
        <StatCard
          icon={<FaClipboardList />}
          title="Pending Assignments"
          value={assignments.filter(a => a.status === "pending").length}
          subtitle="Due in next 7 days"
          color="warning"
          progress={60}
          trend="Action required"
        />
      </div>

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="row g-3 g-md-4">
        {/* LEFT COLUMN - ACADEMIC SECTIONS */}
        <div className="col-lg-8">
          {/* ================= UPCOMING EXAMS ================= */}
          <SectionCard 
            title="Upcoming Exams" 
            icon={<FaCalendarAlt />} 
            color="danger"
            actionButton={
              <button className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1">
                <FaDownload size={12} /> Exam Schedule
              </button>
            }
          >
            {exams.length === 0 ? (
              <div className="text-center py-4">
                <FaCalendarAlt className="text-muted mb-2" size={48} />
                <p className="text-muted mb-0">No upcoming exams scheduled</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Subject</th>
                      <th>Date & Time</th>
                      <th>Venue</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam, idx) => (
                      <tr key={exam.id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                        <td className="fw-semibold">{exam.subject}</td>
                        <td>
                          <div>{new Date(exam.date).toLocaleDateString()}</div>
                          <small className="text-muted">{exam.time}</small>
                        </td>
                        <td>{exam.venue}</td>
                        <td>
                          <span className={`badge ${
                            exam.status === "upcoming" ? "bg-warning" :
                            exam.status === "completed" ? "bg-success" : "bg-secondary"
                          }`}>
                            {exam.status === "upcoming" && <FaClock className="me-1" />}
                            {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* ================= RECENT ASSIGNMENTS ================= */}
          <SectionCard 
            title="Recent Assignments" 
            icon={<FaFileAlt />} 
            color="info"
            actionButton={
              <button className="btn btn-sm btn-outline-info d-flex align-items-center gap-1">
                <FaPlus size={12} /> New Assignment
              </button>
            }
          >
            {assignments.length === 0 ? (
              <div className="text-center py-4">
                <FaFileAlt className="text-muted mb-2" size={48} />
                <p className="text-muted mb-0">No assignments available</p>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {assignments.map((assignment, idx) => (
                  <div 
                    key={assignment.id} 
                    className="list-group-item d-flex justify-content-between align-items-start px-0 border-0 animate-fade-in"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className="flex-grow-1 me-3">
                      <div className="d-flex justify-content-between">
                        <h6 className="fw-bold mb-1">{assignment.title}</h6>
                        <span className={`badge ${
                          assignment.status === "pending" ? "bg-warning" :
                          assignment.status === "submitted" ? "bg-success" : "bg-secondary"
                        }`}>
                          {assignment.status === "pending" && <FaClock className="me-1" />}
                          {assignment.status === "submitted" && <FaCheckCircle className="me-1" />}
                          {assignment.status}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-3 text-muted small">
                        <div><FaBook className="me-1" /> {assignment.course}</div>
                        <div><FaClock className="me-1" /> Due: {new Date(assignment.dueDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button className="btn btn-sm btn-outline-primary">View</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* RIGHT COLUMN - PERSONAL SECTIONS */}
        <div className="col-lg-4">
          <div className="sticky-top" style={{ top: "15px" }}>
            {/* ================= COURSE PROGRESS ================= */}
            <SectionCard 
              title="Course Progress" 
              icon={<FaBook />} 
              color="success"
            >
              {courses.length === 0 ? (
                <div className="text-center py-4">
                  <FaBook className="text-muted mb-2" size={48} />
                  <p className="text-muted mb-0">No courses enrolled</p>
                </div>
              ) : (
                <div className="row g-3">
                  {courses.map((course, idx) => (
                    <div key={course.id} className="col-12 animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h6 className="fw-bold mb-0">{course.name}</h6>
                          <small className="text-muted">{course.code} • {course.credits} credits</small>
                        </div>
                        <span className="badge bg-success">{course.progress}%</span>
                      </div>
                      <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                        <div 
                          className="progress-bar bg-success" 
                          role="progressbar" 
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                      <small className="text-muted mt-1 d-block">
                        {course.progress < 50 ? "Needs attention" : course.progress < 80 ? "Good progress" : "Excellent!"}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ================= NOTIFICATIONS ================= */}
            <SectionCard 
              title="College Notifications" 
              icon={<FaBell />} 
              color="primary"
            >
              {notifications.length === 0 ? (
                <div className="text-center py-4">
                  <FaBell className="text-muted mb-2" size={48} />
                  <p className="text-muted mb-0">No notifications</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {notifications.map((notification, idx) => (
                    <div 
                      key={notification.id} 
                      className={`list-group-item border-0 px-0 py-2 animate-fade-in ${
                        idx < notifications.length - 1 ? 'border-bottom' : ''
                      }`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="d-flex align-items-start gap-2">
                        <div className={`flex-shrink-0 mt-1 p-2 rounded-circle ${
                          notification.type === "info" ? "bg-info bg-opacity-10" :
                          notification.type === "warning" ? "bg-warning bg-opacity-10" :
                          "bg-success bg-opacity-10"
                        }`}>
                          {notification.type === "info" && <FaInfoCircle className="text-info" size={16} />}
                          {notification.type === "warning" && <FaExclamationTriangle className="text-warning" size={16} />}
                          {notification.type === "success" && <FaCheckCircle className="text-success" size={16} />}
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-0 small">{notification.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ================= QUICK ACTIONS ================= */}
            <SectionCard 
              title="Quick Actions" 
              icon={<FaLightbulb />} 
              color="dark"
            >
              <div className="row g-2">
                {[
                  { icon: <FaCalendarAlt />, label: "Timetable", path: "/student/timetable" },
                  { icon: <FaMoneyCheckAlt />, label: "Fee Payment", path: "/student/fees" },
                  { icon: <FaFileAlt />, label: "Results", path: "/student/results" },
                  { icon: <FaDownload />, label: "Documents", path: "/student/documents" },
                  { icon: <FaPrint />, label: "ID Card", path: "/student/id-card" },
                  { icon: <FaTasks />, label: "My Tasks", path: "/student/tasks" }
                ].map((action, idx) => (
                  <div className="col-6" key={idx}>
                    <button
                      onClick={() => navigate(action.path)}
                      className="btn w-100 d-flex flex-column align-items-center gap-1 py-3 rounded-3 border-0 bg-light text-dark hover-lift animate-fade-in"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="fs-4 mb-1">{action.icon}</div>
                      <span className="fw-semibold small">{action.label}</span>
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mt-3 mt-md-4 animate-fade-in-up">
        <div className="card-body p-3 p-md-4 bg-light">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-center text-md-start">
              <p className="mb-1">
                <small className="text-muted">
                  <FaGraduationCap className="me-1" />
                  Student Dashboard | Smart College ERP System
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
                onClick={() => window.location.reload()}
              >
                <FaSync size={12} /> Refresh
              </button>
              <button 
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                onClick={() => navigate("/student/profile")}
              >
                <FaUserGraduate size={12} /> My Profile
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
        .blink-fast { animation: blink 0.9s infinite; }
        .hover-lift:hover { animation: lift 0.3s ease forwards; }
        .spin-icon { animation: spin 1s linear infinite; }
        .float-badge { animation: float 3s ease-in-out infinite; }

        .bg-gradient-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }

        .dashboard-logo-container {
          width: 60px;
          height: 60px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        .section-card {
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          margin-bottom: 1.5rem;
        }
        .section-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.12);
        }

        .section-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e9ecef;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-body {
          padding: 1.5rem;
        }

        .stat-card {
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          height: 100%;
          border: none;
        }
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        .stat-card .card-body {
          padding: 1.5rem;
        }
        .stat-card .fs-2 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .stat-card h6 {
          font-size: 0.95rem;
          font-weight: 600;
          opacity: 0.9;
          margin-bottom: 0.25rem;
        }
        .stat-card .value {
          font-size: 2rem;
          font-weight: 700;
          margin: 0.25rem 0;
        }
        .stat-card .subtitle {
          font-size: 0.85rem;
          opacity: 0.8;
          margin-bottom: 0.75rem;
        }
        .stat-card .trend {
          font-size: 0.85rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .stat-card .progress {
          height: 6px;
          border-radius: 10px;
          margin-bottom: 1rem;
        }

        @media (max-width: 992px) {
          .sticky-top {
            position: static !important;
          }
          .dashboard-logo-container {
            width: 50px;
            height: 50px;
          }
        }

        @media (max-width: 768px) {
          .stat-card .fs-2 {
            font-size: 2rem;
          }
          .stat-card .value {
            font-size: 1.75rem;
          }
          .btn-sm {
            padding: 0.25rem 0.5rem !important;
            font-size: 0.75rem !important;
          }
        }

        @media (max-width: 576px) {
          .dashboard-logo-container {
            width: 45px;
            height: 45px;
          }
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .stat-card {
            border-radius: 12px;
          }
        }
      `}</style>
    </div>
  );
}

/* ================= STAT CARD COMPONENT ================= */
function StatCard({ icon, title, value, subtitle, color, progress, trend, trendColor = "" }) {
  return (
    <div className="col-6 col-md-4 col-lg-3 mb-3">
      <div className={`card h-100 border-0 stat-card bg-light-${color} animate-fade-in-up`}>
        <div className="card-body text-center">
          <div className={`fs-2 text-${color} mb-2`}>{icon}</div>
          <h6 className="text-muted mb-1">{title}</h6>
          <div className={`value text-${color}`}>{value}</div>
          {subtitle && <div className="subtitle text-muted">{subtitle}</div>}
          
          <div className="progress mb-2">
            <div 
              className={`progress-bar bg-${color}`} 
              role="progressbar" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {trend && (
            <div className={`trend ${trendColor || `text-${color}`}`}>
              <span className="trend-dot" style={{ 
                display: 'inline-block', 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: 'currentColor',
                marginRight: '4px'
              }}></span>
              {trend}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= SECTION CARD COMPONENT ================= */
function SectionCard({ title, icon, color, children, actionButton = null }) {
  return (
    <div className="section-card animate-fade-in-up">
      <div className="section-header bg-light">
        <div className="section-title">
          <span className={`text-${color}`}>{icon}</span>
          {title}
        </div>
        {actionButton}
      </div>
      <div className="section-body">
        {children}
      </div>
    </div>
  );
}