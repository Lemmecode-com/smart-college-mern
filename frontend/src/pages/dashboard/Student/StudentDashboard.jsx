import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaUserGraduate,
  FaBook,
  FaBuilding,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaClock,
  FaMapMarkerAlt,
  FaChalkboardTeacher,
  FaRupeeSign,
  FaBell,
  FaCalendarAlt,
  FaChartPie,
  FaChartBar,
  FaDownload,
  FaEye,
  FaWallet,
  FaGraduationCap,
  FaAward,
  FaTrophy,
  FaStar,
  FaSync,
  FaUniversity,
  FaClipboardCheck,
} from "react-icons/fa";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function StudentDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, [retryCount]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/dashboard/student");
      setDashboardData(response.data);
      
      // Show success toast only on successful load (not initial)
      if (dashboardData) {
        toast.success("Dashboard loaded successfully!", {
          position: "top-right",
          autoClose: 3000,
          icon: <FaCheckCircle />
        });
      }
    } catch (err) {
      // Silently handle auth errors
      if (err.response?.status !== 403 && err.response?.status !== 401) {
        console.error("Dashboard fetch error:", err);
        const errorMsg = err.response?.data?.message || "Failed to load dashboard. Please check your connection and try again.";
        setError(errorMsg);
        toast.error(errorMsg, {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    toast.info("Refreshing dashboard...", {
      position: "top-right",
      autoClose: 2000,
      icon: <FaSync />
    });
    setRetryCount((prev) => prev + 1);
  };

  // Tooltip Component
  const InfoTooltip = ({ message }) => (
    <div className="info-tooltip-wrapper">
      <FaInfoCircle className="info-icon" />
      <div className="info-tooltip-content">
        <span className="tooltip-text">{message}</span>
      </div>
    </div>
  );

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-chart-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.fill }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Prepare Attendance Pie Chart Data
  const attendancePieData = dashboardData
    ? [
        {
          name: "Present",
          value: dashboardData.attendanceSummary.present,
          color: "#28a745",
        },
        {
          name: "Absent",
          value: dashboardData.attendanceSummary.absent,
          color: "#dc3545",
        },
      ]
    : [];

  // Prepare Subject-wise Bar Chart Data
  const subjectBarData =
    dashboardData?.subjectWiseAttendance.map((subject) => ({
      subject: subject.subject,
      code: subject.code,
      present: subject.present,
      total: subject.total,
      percentage: subject.percentage,
    })) || [];

  // Loading State
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <FaGraduationCap className="spinner-icon" />
          <div className="loading-text">Loading your dashboard...</div>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>
        {/* Skeleton Cards */}
        <div className="skeleton-cards">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
        {/* Skeleton Table */}
        <div className="skeleton-table">
          <div className="skeleton-table-header" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-table-row" />
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-content">
          <FaExclamationTriangle className="error-icon" />
          <h3>Oops! Something went wrong</h3>
          <p className="error-message">{error}</p>
          <button onClick={handleRetry} className="retry-btn">
            <FaSync /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const {
    student,
    attendanceSummary,
    subjectWiseAttendance,
    todayTimetable,
    feeSummary,
    latestNotifications,
  } = dashboardData || {};

  // Set default values for feeSummary if not available
  const safeFeeSummary = feeSummary || {
    totalFee: 0,
    paid: 0,
    due: 0,
    paymentStatus: "NOT_GENERATED",
  };

  // Utility Functions
  const getFeeStatusColor = (status) => {
    const colors = {
      PAID: "#28a745",
      PARTIAL: "#ffc107",
      DUE: "#dc3545",
    };
    return colors[status] || "#6c757d";
  };

  const getAttendanceWarningColor = (percentage) => {
    if (percentage >= 75) return "#28a745";
    if (percentage >= 60) return "#ffc107";
    return "#dc3545";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="student-dashboard-container">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      
      {/* ================= HEADER ================= */}
      <div className="dashboard-header fade-in">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <FaGraduationCap />
          </div>
          <div>
            <h1 className="dashboard-title">Welcome, {student.name}!</h1>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-refresh" onClick={handleRetry}>
            <FaSync className={loading ? "spinning" : ""} /> Refresh
          </button>
          <Link to="/student/make-payment" className="btn-primary">
            <FaWallet /> Pay Fees
          </Link>
        </div>
      </div>

      {/* ================= QUICK ACTIONS (MOVED TO TOP) ================= */}
      <div className="dashboard-card quick-actions-card fade-in-up" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title-wrapper">
            <FaStar className="card-icon blink-fast" />
            <h3>Quick Actions</h3>
            <InfoTooltip message="Frequently used actions" />
          </div>
        </div>

        <div className="card-body">
          <div className="quick-actions-grid">
            <Link to="/my-attendance" className="quick-action-item quick-action-blink">
              <FaChartPie className="action-icon" />
              <span>Attendance</span>
            </Link>
            <Link to="/student/timetable" className="quick-action-item quick-action-blink">
              <FaCalendarAlt className="action-icon" />
              <span>Timetable</span>
            </Link>
            <Link to="/student/fees" className="quick-action-item quick-action-blink">
              <FaWallet className="action-icon" />
              <span>Fees</span>
            </Link>
            <Link to="/student/profile" className="quick-action-item quick-action-blink">
              <FaUserGraduate className="action-icon" />
              <span>Profile</span>
            </Link>
            <Link to="/notification/student" className="quick-action-item quick-action-blink">
              <FaBell className="action-icon" />
              <span>Notifications</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ================= INFO CARDS ROW ================= */}
      <div className="info-cards-row">
        <div className="info-card fade-in-up">
          <div className="card-icon-wrapper blue">
            <FaUserGraduate />
          </div>
          <div className="card-content">
            <h3>{student.name}</h3>
            <p>Student Name</p>
          </div>
        </div>

        <div className="info-card fade-in-up">
          <div className="card-icon-wrapper green">
            <FaGraduationCap />
          </div>
          <div className="card-content">
            <h3>{student.course}</h3>
            <p>Current Course</p>
          </div>
        </div>

        <div className="info-card fade-in-up">
          <div className="card-icon-wrapper purple">
            <FaUniversity />
          </div>
          <div className="card-content">
            <h3>{student.department}</h3>
            <p>Department</p>
          </div>
        </div>

        <div className="info-card fade-in-up">
          <div className="card-icon-wrapper orange">
            <FaClipboardCheck />
          </div>
          <div className="card-content">
            <h3>{attendanceSummary.percentage}%</h3>
            <p>Attendance</p>
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="dashboard-grid">
        {/* ================= ATTENDANCE SUMMARY ================= */}
        <div className="dashboard-card attendance-card fade-in-up">
          <div className="card-header">
            <div className="card-title-wrapper">
              <FaChartPie className="card-icon" />
              <h3>Attendance Summary</h3>
              <InfoTooltip message="Your overall attendance statistics" />
            </div>
            <Link to="/my-attendance" className="view-all-link">
              <FaEye /> View All
            </Link>
          </div>

          <div className="card-body">
            {/* Enhanced Stats with Hover Effects */}
            <div className="attendance-stats">
              <div className="stat-item stat-item-hover" role="listitem" aria-label={`${attendanceSummary.present} lectures present`}>
                <FaCheckCircle className="stat-icon present" aria-hidden="true" />
                <div>
                  <span className="stat-value stat-value-large">{attendanceSummary.present}</span>
                  <span className="stat-label">Present</span>
                </div>
              </div>
              <div className="stat-item stat-item-hover" role="listitem" aria-label={`${attendanceSummary.absent} lectures absent`}>
                <FaTimesCircle className="stat-icon absent" aria-hidden="true" />
                <div>
                  <span className="stat-value stat-value-large">{attendanceSummary.absent}</span>
                  <span className="stat-label">Absent</span>
                </div>
              </div>
              <div className="stat-item stat-item-hover" role="listitem" aria-label={`${attendanceSummary.total} total lectures`}>
                <FaClock className="stat-icon total" aria-hidden="true" />
                <div>
                  <span className="stat-value stat-value-large">{attendanceSummary.total}</span>
                  <span className="stat-label">Total</span>
                </div>
              </div>
            </div>

            {/* Enhanced Pie Chart with better dimensions */}
            <div className="attendance-chart">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                  >
                    {attendancePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Enhanced Progress Bar with Integrated Warning */}
            <div className="attendance-percentage">
              <div className="percentage-header">
                <span
                  className="percentage-text percentage-text-large"
                  style={{
                    color: getAttendanceWarningColor(attendanceSummary.percentage),
                  }}
                >
                  {attendanceSummary.percentage}% Overall Attendance
                </span>
                {attendanceSummary.warning && (
                  <div className="attendance-warning attendance-warning-inline">
                    <FaExclamationTriangle aria-hidden="true" /> 
                    <span>Low Attendance! Minimum 75% required for exam eligibility.</span>
                  </div>
                )}
              </div>
              <div
                className="progress-bar-wrapper progress-bar-thick"
                role="progressbar"
                aria-valuenow={attendanceSummary.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Attendance progress: ${attendanceSummary.percentage}%`}
              >
                <div
                  className="progress-bar progress-bar-animated"
                  style={{
                    width: `${attendanceSummary.percentage}%`,
                    backgroundColor: getAttendanceWarningColor(
                      attendanceSummary.percentage
                    ),
                  }}
                />
              </div>
              <div className="progress-thresholds">
                <span className="threshold-marker" style={{ left: '75%' }}>
                  <span className="threshold-line"></span>
                  <span className="threshold-label">75% Min</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= SUBJECT-WISE ATTENDANCE ================= */}
        <div className="dashboard-card subject-attendance-card fade-in-up">
          <div className="card-header">
            <div className="card-title-wrapper">
              <FaChartBar className="card-icon" />
              <h3>Subject-wise Attendance</h3>
              <InfoTooltip message="Attendance breakdown by subject. Subjects with low attendance are highlighted in red." />
            </div>
          </div>

          <div className="card-body">
            {/* Enhanced Bar Chart with Risk-Based Colors */}
            <div className="subject-chart">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={subjectBarData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="code"
                    tick={{ fontSize: 11, fontWeight: 500 }}
                    interval={0}
                    height={50}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Lectures', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <ReferenceLine
                    y={Math.max(...subjectBarData.map(s => s.total)) * 0.75}
                    stroke="#dc3545"
                    strokeDasharray="3 3"
                    label={{ value: '75% Target', fill: '#dc3545', fontSize: 10, position: 'right' }}
                  />
                  <Bar
                    dataKey="present"
                    name="Present"
                    radius={[6, 6, 0, 0]}
                    animationDuration={1000}
                  >
                    {subjectBarData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.percentage >= 75 ? '#28a745' : entry.percentage >= 60 ? '#ffc107' : '#dc3545'}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="total"
                    name="Total"
                    fill="#80adda"
                    radius={[6, 6, 0, 0]}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Enhanced Subject List with Teacher Info and Trends */}
            <div className="subject-list" role="list" aria-label="Subject-wise attendance list">
              {subjectWiseAttendance
                .sort((a, b) => a.percentage - b.percentage) // Sort by attendance (lowest first)
                .map((subject, index) => {
                  const attendanceColor = getAttendanceWarningColor(subject.percentage);
                  const needsAttention = subject.percentage < 75;
                  const lecturesNeeded = Math.ceil(
                    ((75 * (subject.present + subject.total - subject.present)) / 25) - subject.present
                  );
                  
                  return (
                    <div 
                      key={index} 
                      className={`subject-item subject-item-hover ${needsAttention ? 'subject-item-warning' : ''}`}
                      role="listitem"
                      aria-label={`${subject.subject}: ${subject.percentage}% attendance`}
                    >
                      <div className="subject-info">
                        <div className="subject-info-main">
                          <span className="subject-name">{subject.subject}</span>
                          <span className="subject-code">{subject.code}</span>
                        </div>
                        {needsAttention && (
                          <div className="subject-attention-badge">
                            <FaExclamationTriangle size={12} />
                            <span>Needs Attention</span>
                          </div>
                        )}
                      </div>
                      <div className="subject-progress">
                        <div className="progress-bar-wrapper progress-bar-thick" role="progressbar" aria-valuenow={subject.percentage} aria-valuemin={0} aria-valuemax={100}>
                          <div
                            className="progress-bar progress-bar-animated"
                            style={{
                              width: `${subject.percentage}%`,
                              backgroundColor: attendanceColor,
                            }}
                          />
                        </div>
                        <div className="subject-progress-info">
                          <span
                            className="percentage-text percentage-text-bold"
                            style={{ color: attendanceColor }}
                          >
                            {subject.percentage}%
                          </span>
                          <span className="subject-lectures-count">
                            {subject.present}/{subject.total}
                          </span>
                        </div>
                        {needsAttention && lecturesNeeded > 0 && lecturesNeeded < subject.total && (
                          <div className="subject-action-needed">
                            Need {lecturesNeeded} more to reach 75%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* ================= TODAY'S TIMETABLE ================= */}
        <div className="dashboard-card timetable-card fade-in-up">
          <div className="card-header">
            <div className="card-title-wrapper">
              <FaCalendarAlt className="card-icon" />
              <h3>Today's Timetable</h3>
              <InfoTooltip message="Your scheduled classes for today" />
            </div>
            <Link to="/student/timetable" className="view-all-link">
              <FaEye /> Full Timetable
            </Link>
          </div>

          <div className="card-body">
            {todayTimetable.length === 0 ? (
              <div className="no-data">
                <FaCalendarAlt className="no-data-icon" />
                <p>No classes scheduled for today</p>
              </div>
            ) : (
              <div className="timetable-list">
                {todayTimetable.map((slot, index) => (
                  <div key={index} className="timetable-slot">
                    <div className="slot-time">
                      <FaClock className="time-icon" />
                      <div className="time-range">
                        <span className="start-time">{slot.startTime}</span>
                        <span className="time-separator">-</span>
                        <span className="end-time">{slot.endTime}</span>
                      </div>
                    </div>
                    <div className="slot-details">
                      <h4 className="slot-subject">{slot.subject}</h4>
                      <div className="slot-meta">
                        <span className="slot-code">{slot.code}</span>
                        <span className="slot-type">{slot.slotType}</span>
                      </div>
                      <div className="slot-info">
                        <span className="slot-teacher">
                          <FaChalkboardTeacher /> {slot.teacher}
                        </span>
                        <span className="slot-room">
                          <FaMapMarkerAlt /> Room {slot.room}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= FEE SUMMARY ================= */}
        <div className="dashboard-card fee-card fade-in-up">
          <div className="card-header">
            <div className="card-title-wrapper">
              <FaWallet className="card-icon" />
              <h3>Fee Summary</h3>
              <InfoTooltip message="Your fee payment status" />
            </div>
            <Link to="/student/fees" className="view-all-link">
              <FaEye /> View Details
            </Link>
          </div>

          <div className="card-body">
            <div className="fee-overview">
              <div className="fee-stat">
                <span className="fee-label">Total Fee</span>
                <span className="fee-value">
                  {formatCurrency(safeFeeSummary.totalFee)}
                </span>
              </div>
              <div className="fee-stat">
                <span className="fee-label">Paid</span>
                <span className="fee-value paid">
                  {formatCurrency(safeFeeSummary.paid)}
                </span>
              </div>
              <div className="fee-stat">
                <span className="fee-label">Due</span>
                <span className="fee-value due">
                  {formatCurrency(safeFeeSummary.due)}
                </span>
              </div>
            </div>

            <div className="fee-status">
              <div
                className="status-badge"
                style={{ backgroundColor: getFeeStatusColor(safeFeeSummary.paymentStatus) }}
              >
                {safeFeeSummary.paymentStatus}
              </div>
            </div>

            <div className="fee-progress">
              <div className="progress-label">
                <span>Payment Progress</span>
                <span>
                  {Math.round((safeFeeSummary.paid / safeFeeSummary.totalFee) * 100)}%
                </span>
              </div>
              <div className="progress-bar-wrapper">
                <div
                  className="progress-bar"
                  style={{
                    width: `${(safeFeeSummary.paid / safeFeeSummary.totalFee) * 100}%`,
                    backgroundColor: getFeeStatusColor(safeFeeSummary.paymentStatus),
                  }}
                />
              </div>
            </div>

            {safeFeeSummary.paymentStatus !== "PAID" && (
              <Link to="/student/make-payment" className="btn-pay-now">
                <FaRupeeSign /> Pay Now
              </Link>
            )}
          </div>
        </div>

        {/* ================= LATEST NOTIFICATIONS ================= */}
        <div className="dashboard-card notifications-card fade-in-up">
          <div className="card-header">
            <div className="card-title-wrapper">
              <FaBell className="card-icon" />
              <h3>Latest Notifications</h3>
              <InfoTooltip message="Recent announcements and updates" />
            </div>
            <Link to="/notification/student" className="view-all-link">
              <FaEye /> View All
            </Link>
          </div>

          <div className="card-body">
            {latestNotifications.length === 0 ? (
              <div className="no-data">
                <FaBell className="no-data-icon" />
                <p>No new notifications</p>
              </div>
            ) : (
              <div className="notifications-list">
                {latestNotifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification._id}
                    className={`notification-item ${
                      !notification.isRead ? "unread" : ""
                    }`}
                  >
                    <div className="notification-icon">
                      <FaBell
                        className={notification.isRead ? "read" : "unread"}
                      />
                    </div>
                    <div className="notification-content">
                      <h4 className="notification-title">{notification.title}</h4>
                      <p className="notification-message">{notification.message}</p>
                      <div className="notification-meta">
                        <span className="notification-type">
                          {notification.type}
                        </span>
                        <span className="notification-date">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        /* ================= CONTAINER ================= */
        .student-dashboard-container {
          padding: 1.5rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          min-height: 100vh;
        }

        /* ================= LOADING STATE ================= */
        .dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          gap: 2rem;
          padding: 2rem;
        }

        .loading-spinner {
          text-align: center;
        }

        .spinner-icon {
          font-size: 5rem;
          color: #1a4b6d;
          animation: float 3s ease-in-out infinite;
        }

        .loading-text {
          margin-top: 1.5rem;
          font-size: 1.25rem;
          color: #1a4b6d;
          font-weight: 600;
        }

        .loading-bar {
          width: 200px;
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          margin: 1.5rem auto 0;
          overflow: hidden;
        }

        .loading-progress {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #1a4b6d, #2d6f8f);
          animation: loading 1.5s ease-in-out infinite;
        }

        /* ================= SKELETON LOADERS ================= */
        .skeleton-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          width: 100%;
          max-width: 1200px;
        }

        .skeleton-card {
          background: white;
          border-radius: 12px;
          height: 150px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-table {
          width: 100%;
          max-width: 1200px;
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-table-header {
          height: 40px;
          background: #e0e0e0;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .skeleton-table-row {
          height: 60px;
          background: #f0f0f0;
          border-radius: 8px;
          margin-bottom: 0.75rem;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* ================= ERROR STATE ================= */
        .dashboard-error {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
        }

        .error-content {
          text-align: center;
          padding: 3rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        }

        .error-icon {
          font-size: 5rem;
          color: #dc3545;
          margin-bottom: 1.5rem;
        }

        .error-content h3 {
          margin: 0 0 1rem;
          color: #1a4b6d;
          font-size: 1.75rem;
        }

        .error-message {
          color: #4a5568;
          margin-bottom: 2rem;
          font-size: 1rem;
          line-height: 1.6;
        }

        .retry-btn {
          padding: 0.875rem 2rem;
          background: linear-gradient(135deg, #1a4b6d 0%, #2d6f8f 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.4);
        }

        .retry-btn .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ================= HEADER ================= */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .header-icon-wrapper {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #1a4b6d 0%, #2d6f8f 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 2.5rem;
          box-shadow: 0 4px 15px rgba(26, 75, 109, 0.3);
        }

        .dashboard-title {
          margin: 0;
          font-size: 1.75rem;
          color: #1a4b6d;
          font-weight: 700;
        }

        .dashboard-subtitle {
          margin: 0.25rem 0 0;
          color: #4a5568;
          font-size: 1rem;
        }

        .header-right {
          display: flex;
          gap: 1rem;
        }

        .btn-refresh,
        .btn-primary {
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .btn-refresh {
          background: #f8f9fa;
          color: #1a4b6d;
          border: 2px solid #1a4b6d;
        }

        .btn-refresh:hover {
          background: #1a4b6d;
          color: white;
        }

        .btn-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #2d6f8f 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.4);
        }

        /* ================= INFO CARDS ================= */
        .info-cards-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .info-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          position: relative;
        }

        .info-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }

        .card-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          color: white;
          flex-shrink: 0;
        }

        .card-icon-wrapper.blue { background: linear-gradient(135deg, #007bff, #0056b3); }
        .card-icon-wrapper.green { background: linear-gradient(135deg, #28a745, #1e7e34); }
        .card-icon-wrapper.purple { background: linear-gradient(135deg, #6f42c1, #4a2d8a); }
        .card-icon-wrapper.orange { background: linear-gradient(135deg, #fd7e14, #c95d0a); }

        .card-content {
          flex: 1;
          position: relative;
        }

        .card-content h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #1a4b6d;
          font-weight: 700;
        }

        .card-content p {
          margin: 0.25rem 0 0;
          font-size: 0.85rem;
          color: #4a5568;
        }

        /* ================= TOOLTIP ================= */
        .info-tooltip-wrapper {
          position: absolute;
          top: 0;
          right: 0;
          cursor: pointer;
        }

        .info-icon {
          color: #4a5568;
          font-size: 1rem;
          transition: color 0.3s ease;
        }

        .info-icon:hover {
          color: #1a4b6d;
        }

        .info-tooltip-content {
          position: absolute;
          top: 100%;
          right: 0;
          background: #1a4b6d;
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          z-index: 100;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          margin-top: 5px;
        }

        .info-tooltip-content::before {
          content: "";
          position: absolute;
          bottom: 100%;
          right: 1rem;
          border: 6px solid transparent;
          border-bottom-color: #1a4b6d;
        }

        .info-tooltip-wrapper:hover .info-tooltip-content {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        /* ================= DASHBOARD GRID ================= */
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        /* ================= CARD STYLES ================= */
        .dashboard-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .dashboard-card:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e9ecef;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .card-title-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .card-icon {
          font-size: 1.25rem;
          color: #1a4b6d;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #1a4b6d;
          font-weight: 700;
        }

        .view-all-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #1a4b6d;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
          transition: color 0.3s ease;
        }

        .view-all-link:hover {
          color: #2d6f8f;
        }

        .card-body {
          padding: 1.5rem;
        }

        /* ================= ATTENDANCE ================= */
        .attendance-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        /* Enhanced Stat Item Hover Effect */
        .stat-item-hover:hover {
          transform: translateY(-3px);
          background: linear-gradient(135deg, #e8f4f8 0%, #d4edda 100%);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
          cursor: pointer;
        }

        .stat-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .stat-icon.present { color: #28a745; }
        .stat-icon.absent { color: #dc3545; }
        .stat-icon.total { color: #1a4b6d; }

        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a4b6d;
          transition: all 0.3s ease;
        }

        /* Enhanced Stat Value - Larger and More Prominent */
        .stat-value-large {
          font-size: 2rem;
          line-height: 1.2;
        }

        .stat-item-hover:hover .stat-value-large {
          transform: scale(1.05);
          display: inline-block;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #4a5568;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .attendance-chart {
          margin: 1.5rem 0;
        }

        .attendance-percentage {
          text-align: center;
        }

        /* Enhanced Percentage Header with Integrated Warning */
        .percentage-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        /* Enhanced Percentage Text - Larger and More Prominent */
        .percentage-text-large {
          font-size: 1.25rem;
          font-weight: 700;
        }

        /* Enhanced Inline Warning */
        .attendance-warning-inline {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
          color: #856404;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
          animation: warning-pulse 2s ease-in-out infinite;
        }

        @keyframes warning-pulse {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
          }
          50% {
            box-shadow: 0 2px 12px rgba(255, 193, 7, 0.5);
          }
        }

        /* Enhanced Progress Bar - Thicker and Animated */
        .progress-bar-thick {
          width: 100%;
          height: 16px;
          background: linear-gradient(90deg, #e9ecef 0%, #dee2e6 100%);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 0.5rem;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .progress-bar-animated {
          height: 100%;
          border-radius: 10px;
          transition: width 1s ease-in-out;
          background: linear-gradient(90deg, currentColor 0%, currentColor 100%);
          animation: progress-shimmer 2s linear infinite;
          background-size: 200% 100%;
        }

        @keyframes progress-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        /* Progress Threshold Marker */
        .progress-thresholds {
          position: relative;
          width: 100%;
          height: 20px;
          margin-top: 0.25rem;
        }

        .threshold-marker {
          position: absolute;
          top: 0;
          transform: translateX(-50%);
        }

        .threshold-line {
          display: block;
          width: 2px;
          height: 10px;
          background: #dc3545;
          margin: 0 auto 0.25rem;
        }

        .threshold-label {
          display: block;
          font-size: 0.7rem;
          color: #dc3545;
          font-weight: 600;
          white-space: nowrap;
        }

        .percentage-text {
          font-size: 0.9rem;
          font-weight: 600;
          color: #4a5568;
        }

        .attendance-warning {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
          color: #856404;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
        }

        /* ================= SUBJECT ATTENDANCE ================= */
        .subject-chart {
          margin-bottom: 1.5rem;
        }

        .subject-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Enhanced Subject Item */
        .subject-item {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1.25rem;
          background: #f8f9fa;
          border-radius: 10px;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }

        /* Subject Item Hover Effect */
        .subject-item-hover:hover {
          transform: translateX(5px);
          background: linear-gradient(135deg, #f8f9fa 0%, #e8f4f8 100%);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          cursor: pointer;
        }

        /* Subject Item Warning State (Low Attendance) */
        .subject-item-warning {
          background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
          border-left-color: #dc3545;
        }

        .subject-item-warning:hover {
          box-shadow: 0 4px 20px rgba(220, 53, 69, 0.2);
        }

        .subject-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .subject-info-main {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .subject-name {
          font-weight: 600;
          color: #1a4b6d;
          font-size: 1rem;
        }

        .subject-code {
          font-size: 0.75rem;
          color: #4a5568;
          background: #e9ecef;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 500;
        }

        /* Subject Attention Badge */
        .subject-attention-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: white;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        /* Enhanced Subject Progress */
        .subject-progress {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
        }

        .subject-progress .progress-bar-wrapper {
          width: 100%;
          margin-bottom: 0;
        }

        /* Subject Progress Info (Percentage + Count) */
        .subject-progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.25rem;
        }

        .percentage-text-bold {
          font-size: 1rem;
          font-weight: 700;
        }

        .subject-lectures-count {
          font-size: 0.85rem;
          color: #4a5568;
          font-weight: 600;
          background: #e9ecef;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        /* Subject Action Needed Text */
        .subject-action-needed {
          font-size: 0.75rem;
          color: #dc3545;
          font-weight: 600;
          background: rgba(220, 53, 69, 0.1);
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          text-align: center;
          margin-top: 0.25rem;
        }

        /* ================= TIMETABLE ================= */
        .timetable-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .timetable-slot {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 8px;
          border-left: 4px solid #1a4b6d;
          transition: all 0.3s ease;
        }

        .timetable-slot:hover {
          transform: translateX(5px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .slot-time {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 90px;
          padding: 0.75rem;
          background: white;
          border-radius: 8px;
          text-align: center;
        }

        .time-icon {
          font-size: 1.25rem;
          color: #1a4b6d;
          margin-bottom: 0.25rem;
        }

        .time-range {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #1a4b6d;
        }

        .time-separator {
          color: #4a5568;
        }

        .slot-details {
          flex: 1;
        }

        .slot-subject {
          margin: 0 0 0.5rem;
          font-size: 1rem;
          color: #1a4b6d;
          font-weight: 700;
        }

        .slot-meta {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .slot-code,
        .slot-type {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          background: #e9ecef;
          color: #4a5568;
          font-weight: 500;
        }

        .slot-type {
          background: #1a4b6d;
          color: white;
        }

        .slot-info {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.85rem;
          color: #4a5568;
        }

        .slot-teacher,
        .slot-room {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* ================= FEE ================= */
        .fee-overview {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .fee-stat {
          text-align: center;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .fee-label {
          display: block;
          font-size: 0.75rem;
          color: #4a5568;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .fee-value {
          display: block;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1a4b6d;
        }

        .fee-value.paid { color: #28a745; }
        .fee-value.due { color: #dc3545; }

        .fee-status {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .status-badge {
          display: inline-block;
          padding: 0.5rem 1.5rem;
          border-radius: 20px;
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .fee-progress {
          margin-bottom: 1.5rem;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
          color: #4a5568;
          font-weight: 600;
        }

        .btn-pay-now {
          display: block;
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
          color: white;
          text-align: center;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .btn-pay-now:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
        }

        /* ================= NOTIFICATIONS ================= */
        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .notification-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #e9ecef;
          transition: all 0.3s ease;
        }

        .notification-item.unread {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border-left-color: #1a4b6d;
        }

        .notification-item:hover {
          transform: translateX(5px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .notification-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .notification-icon .unread { color: #1a4b6d; }
        .notification-icon .read { color: #4a5568; }

        .notification-content {
          flex: 1;
        }

        .notification-title {
          margin: 0 0 0.25rem;
          font-size: 0.95rem;
          color: #1a4b6d;
          font-weight: 700;
        }

        .notification-message {
          margin: 0 0 0.5rem;
          font-size: 0.85rem;
          color: #4a5568;
          line-height: 1.5;
        }

        .notification-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #4a5568;
        }

        .notification-type {
          background: #e9ecef;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          color: #4a5568;
          font-weight: 500;
        }

        /* ================= QUICK ACTIONS ================= */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }

        .quick-action-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 10px;
          text-decoration: none;
          color: #1a4b6d;
          transition: all 0.3s ease;
        }

        .quick-action-item:hover {
          transform: translateY(-5px);
          background: linear-gradient(135deg, #1a4b6d 0%, #2d6f8f 100%);
          color: white;
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.4);
        }

        .action-icon {
          font-size: 1.75rem;
        }

        .quick-action-item span {
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* ================= NO DATA ================= */
        .no-data {
          text-align: center;
          padding: 3rem 1rem;
          color: #4a5568;
        }

        .no-data-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        /* ================= CHART TOOLTIP ================= */
        .custom-chart-tooltip {
          background: white;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
          border: 1px solid #e9ecef;
        }

        .tooltip-label {
          margin: 0 0 0.5rem;
          font-weight: 700;
          color: #1a4b6d;
          font-size: 0.85rem;
        }

        .tooltip-value {
          margin: 0.25rem 0;
          font-size: 0.8rem;
        }

        /* ================= ANIMATIONS ================= */
        .fade-in {
          animation: fadeIn 0.6s ease forwards;
        }

        .fade-in-up {
          animation: fadeInUp 0.6s ease forwards;
          opacity: 0;
        }

        .fade-in-up:nth-child(1) { animation-delay: 0.1s; }
        .fade-in-up:nth-child(2) { animation-delay: 0.2s; }
        .fade-in-up:nth-child(3) { animation-delay: 0.3s; }
        .fade-in-up:nth-child(4) { animation-delay: 0.4s; }
        .fade-in-up:nth-child(5) { animation-delay: 0.5s; }
        .fade-in-up:nth-child(6) { animation-delay: 0.6s; }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        /* ================= BLINKING ANIMATIONS ================= */
        @keyframes blink-fast {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(0.95);
          }
        }

        @keyframes blink-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .blink-fast {
          animation: blink-fast 1.5s ease-in-out infinite;
        }

        .blink-slow {
          animation: blink-slow 2s ease-in-out infinite;
        }

        /* Quick Actions Blinking Effect */
        .quick-action-blink {
          position: relative;
          overflow: hidden;
        }

        .quick-action-blink::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        .quick-action-blink:hover::before {
          animation: none;
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 768px) {
          .student-dashboard-container {
            padding: 1rem;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .header-left {
            flex-direction: column;
          }

          .header-right {
            width: 100%;
            justify-content: center;
          }

          .info-cards-row {
            grid-template-columns: 1fr;
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }

          .attendance-stats,
          .fee-overview {
            grid-template-columns: 1fr;
          }

          .timetable-slot {
            flex-direction: column;
          }

          .slot-time {
            width: 100%;
            flex-direction: row;
            gap: 0.5rem;
          }

          .quick-actions-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 480px) {
          .dashboard-title {
            font-size: 1.5rem;
          }

          .header-icon-wrapper {
            width: 60px;
            height: 60px;
            font-size: 2rem;
          }

          .quick-actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .card-header {
            flex-direction: column;
            gap: 0.75rem;
            text-align: center;
          }

          .card-title-wrapper {
            flex-direction: column;
          }

          .stat-value {
            font-size: 1.25rem;
          }

          .attendance-chart,
          .subject-chart {
            height: 180px;
          }
        }
      `}</style>
    </div>
  );
}