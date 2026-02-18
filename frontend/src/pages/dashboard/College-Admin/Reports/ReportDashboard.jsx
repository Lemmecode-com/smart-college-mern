import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../../api/axios";
import {
  FaGraduationCap,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaRupeeSign,
  FaChartPie,
  FaChartBar,
  FaChartLine,
  FaTable,
  FaDownload,
  FaFilter,
  FaSearch,
  FaExclamationTriangle,
  FaSpinner,
  FaUsers,
  FaWallet,
  FaCalendarCheck,
  FaEye,
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
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

export default function ReportDashboard() {
  // ================= STATE MANAGEMENT =================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Report Data States
  const [admissionData, setAdmissionData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [studentPayments, setStudentPayments] = useState([]);
  const [lowAttendanceStudents, setLowAttendanceStudents] = useState([]);

  // Filter States
  const [courseFilter, setCourseFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceCourseFilter, setAttendanceCourseFilter] = useState("");

  // ================= FETCH DATA =================
  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all reports in parallel from API endpoints
      const [admissionRes, paymentRes, attendanceRes] = await Promise.all([
        api.get("/reports/admissions/college-admin-summary"),
        api.get("/reports/payments/summary"),
        api.get("/reports/attendance/summary"),
      ]);

      setAdmissionData(admissionRes.data);
      setPaymentData(paymentRes.data);
      setAttendanceData(attendanceRes.data);

      // Extract low attendance students from attendance data if available
      // Or fetch from a separate endpoint if needed
      if (attendanceRes.data?.lowAttendanceStudents) {
        setLowAttendanceStudents(attendanceRes.data.lowAttendanceStudents);
      } else {
        // Fallback to static data if API doesn't provide it
        setLowAttendanceStudents(getStaticLowAttendanceStudents());
      }

      // Fetch student payment data from API if available
      // For now using static data - replace with actual API call
      setStudentPayments(getStaticStudentPayments());

      showToast("Reports loaded successfully!", "success");
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(
        err.response?.data?.message || "Failed to load reports. Please try again."
      );
      showToast("Failed to load reports", "error");
    } finally {
      setLoading(false);
    }
  };

  // ================= STATIC DATA (Replace with API when available) =================
  const getStaticStudentPayments = () => [
    {
      _id: "1",
      name: "Rahul Sharma",
      course: "Computer Science",
      totalFee: 95000,
      paid: 45000,
      pending: 50000,
      status: "PARTIAL",
    },
    {
      _id: "2",
      name: "Priya Patel",
      course: "Information Technology",
      totalFee: 95000,
      paid: 95000,
      pending: 0,
      status: "PAID",
    },
    {
      _id: "3",
      name: "Amit Kumar",
      course: "Computer Science",
      totalFee: 95000,
      paid: 0,
      pending: 95000,
      status: "DUE",
    },
    {
      _id: "4",
      name: "Sneha Singh",
      course: "Mechanical Engineering",
      totalFee: 85000,
      paid: 85000,
      pending: 0,
      status: "PAID",
    },
  ];

  const getStaticLowAttendanceStudents = () => [
    {
      _id: "1",
      name: "Vikram Yadav",
      course: "Computer Science",
      attendance: 65,
      status: "WARNING",
    },
    {
      _id: "2",
      name: "Anjali Desai",
      course: "Information Technology",
      attendance: 70,
      status: "WARNING",
    },
    {
      _id: "3",
      name: "Rohan Mehta",
      course: "Mechanical Engineering",
      attendance: 58,
      status: "CRITICAL",
    },
  ];

  // ================= TOAST NOTIFICATIONS =================
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ================= FILTER FUNCTIONS =================
  const filteredStudentPayments = studentPayments.filter((student) => {
    const matchesCourse = courseFilter
      ? student.course === courseFilter
      : true;
    const matchesStatus = paymentStatusFilter
      ? student.status === paymentStatusFilter
      : true;
    const matchesSearch = searchQuery
      ? student.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCourse && matchesStatus && matchesSearch;
  });

  const filteredLowAttendance = lowAttendanceStudents.filter((student) => {
    const matchesCourse = attendanceCourseFilter
      ? student.course === attendanceCourseFilter
      : true;
    return matchesCourse;
  });

  // ================= CHART DATA =================
  const admissionPieData = admissionData
    ? [
        {
          name: "Approved",
          value: admissionData.approved || 0,
          color: "#28a745",
        },
        {
          name: "Pending",
          value: admissionData.pending || 0,
          color: "#ffc107",
        },
        {
          name: "Rejected",
          value: admissionData.rejected || 0,
          color: "#dc3545",
        },
      ]
    : [];

  const paymentBarData = paymentData
    ? [
        {
          name: "Collected",
          amount: paymentData.collected || 0,
          fill: "#28a745",
        },
        {
          name: "Pending",
          amount: paymentData.pending || 0,
          fill: "#dc3545",
        },
      ]
    : [];

  const attendanceLineData = attendanceData?.trend || [
    { month: "Jan", attendance: 75 },
    { month: "Feb", attendance: 78 },
    { month: "Mar", attendance: 82 },
    { month: "Apr", attendance: 80 },
    { month: "May", attendance: 85 },
    { month: "Jun", attendance: 88 },
  ];

  // ================= UTILITY FUNCTIONS =================
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      PAID: "badge-paid",
      PARTIAL: "badge-partial",
      DUE: "badge-due",
      WARNING: "badge-warning",
      CRITICAL: "badge-critical",
    };
    return classes[status] || "badge-default";
  };

  // ================= LOADING STATE =================
  if (loading) {
    return (
      <div className="reports-loading">
        <div className="loading-spinner">
          <FaSpinner className="spin-icon" />
          <p>Loading Reports...</p>
        </div>
      </div>
    );
  }

  // ================= ERROR STATE =================
  if (error) {
    return (
      <div className="reports-error">
        <FaExclamationTriangle className="error-icon" />
        <h3>Error Loading Reports</h3>
        <p>{error}</p>
        <button onClick={fetchAllReports} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="report-dashboard-container">
      {/* ================= TOAST NOTIFICATION ================= */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === "success" && <FaCheckCircle />}
          {toast.type === "error" && <FaExclamationTriangle />}
          {toast.message}
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="dashboard-header fade-in">
        <div className="header-content">
          <FaChartBar className="header-icon" />
          <div>
            <h1 className="dashboard-title">Reports & Analytics Dashboard</h1>
            <p className="dashboard-subtitle">
              Comprehensive overview of college performance metrics
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={fetchAllReports}>
            <FaChartLine /> Refresh Data
          </button>
          <button className="btn-export">
            <FaDownload /> Export All
          </button>
        </div>
      </div>

      {/* ================= DYNAMIC SUMMARY CARDS ================= */}
      <div className="summary-cards-grid">
        {/* Total Applications Card */}
        <div className="summary-card blink-effect">
          <div className="card-icon-wrapper blue">
            <FaUsers className="icon-blink" />
          </div>
          <div className="card-content">
            <h3 className="value-blink">{admissionData?.total || 0}</h3>
            <p>Total Applications</p>
          </div>
        </div>

        {/* Total Collected Card */}
        <div className="summary-card blink-effect">
          <div className="card-icon-wrapper green">
            <FaWallet className="icon-blink" />
          </div>
          <div className="card-content">
            <h3 className="value-blink">{formatCurrency(paymentData?.collected || 0)}</h3>
            <p>Total Collected</p>
          </div>
        </div>

        {/* Avg Attendance Card */}
        <div className="summary-card blink-effect">
          <div className="card-icon-wrapper purple">
            <FaCalendarCheck className="icon-blink" />
          </div>
          <div className="card-content">
            <h3 className="value-blink">{attendanceData?.percentage || 0}%</h3>
            <p>Avg Attendance</p>
          </div>
        </div>

        {/* Low Attendance Card */}
        <div className="summary-card blink-effect warning">
          <div className="card-icon-wrapper orange">
            <FaExclamationTriangle className="icon-blink" />
          </div>
          <div className="card-content">
            <h3 className="value-blink">{lowAttendanceStudents.length}</h3>
            <p>Low Attendance</p>
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="reports-grid">
        {/* ================= ADMISSION SUMMARY ================= */}
        <div className="report-card admission-card fade-in-up">
          <div className="card-header">
            <div className="card-title-wrapper">
              <FaGraduationCap className="card-icon" />
              <h3>Admission Summary</h3>
            </div>
            <Link to="/reports/admissions" className="view-all-link">
              <FaEye /> View Details
            </Link>
          </div>

          <div className="card-body">
            <div className="stats-grid">
              <div className="stat-box">
                <FaCheckCircle className="stat-icon approved" />
                <div>
                  <span className="stat-value">{admissionData?.approved || 0}</span>
                  <span className="stat-label">Approved</span>
                  <span className="stat-percentage">
                    {admissionData?.approvedPercentage || 0}%
                  </span>
                </div>
              </div>

              <div className="stat-box">
                <FaClock className="stat-icon pending" />
                <div>
                  <span className="stat-value">{admissionData?.pending || 0}</span>
                  <span className="stat-label">Pending</span>
                  <span className="stat-percentage">
                    {admissionData?.pendingPercentage || 0}%
                  </span>
                </div>
              </div>

              <div className="stat-box">
                <FaTimesCircle className="stat-icon rejected" />
                <div>
                  <span className="stat-value">{admissionData?.rejected || 0}</span>
                  <span className="stat-label">Rejected</span>
                  <span className="stat-percentage">
                    {admissionData?.rejectedPercentage || 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={admissionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {admissionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ================= PAYMENT SUMMARY ================= */}
        <div className="report-card payment-card fade-in-up">
          <div className="card-header">
            <div className="card-title-wrapper">
              <FaWallet className="card-icon" />
              <h3>Payment Summary</h3>
            </div>
            <Link to="/reports/payments" className="view-all-link">
              <FaEye /> View Details
            </Link>
          </div>

          <div className="card-body">
            <div className="payment-overview">
              <div className="payment-stat">
                <span className="payment-label">Total Expected</span>
                <span className="payment-value">
                  {formatCurrency(paymentData?.total || 0)}
                </span>
              </div>
              <div className="payment-stat collected">
                <span className="payment-label">Total Collected</span>
                <span className="payment-value">
                  {formatCurrency(paymentData?.collected || 0)}
                </span>
              </div>
              <div className="payment-stat pending">
                <span className="payment-label">Total Pending</span>
                <span className="payment-value">
                  {formatCurrency(paymentData?.pending || 0)}
                </span>
              </div>
              <div className="payment-stat rate">
                <span className="payment-label">Collection Rate</span>
                <span className="payment-value">
                  {paymentData?.collectionRate || 0}%
                </span>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={paymentBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="amount" name="Amount (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ================= STUDENT PAYMENT STATUS ================= */}
        <div className="report-card payment-table-card fade-in-up">
          <div className="card-header">
            <div className="card-title-wrapper">
              <FaTable className="card-icon" />
              <h3>Student Payment Status</h3>
            </div>
            <button className="btn-filter">
              <FaFilter /> Filter
            </button>
          </div>

          <div className="card-body">
            {/* Filters */}
            <div className="filters-row">
              <div className="filter-group">
                <FaSearch className="filter-icon" />
                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Courses</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">IT</option>
                <option value="Mechanical Engineering">Mechanical</option>
              </select>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="DUE">Due</option>
              </select>
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Course</th>
                    <th>Total Fee</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudentPayments.map((student) => (
                    <tr key={student._id}>
                      <td className="student-name">{student.name}</td>
                      <td>{student.course}</td>
                      <td>{formatCurrency(student.totalFee)}</td>
                      <td className="text-success">
                        {formatCurrency(student.paid)}
                      </td>
                      <td className="text-danger">
                        {formatCurrency(student.pending)}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${getStatusBadgeClass(
                            student.status
                          )}`}
                        >
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ================= ATTENDANCE SUMMARY ================= */}
        <div className="report-card attendance-card fade-in-up">
          <div className="card-header">
            <div className="card-title-wrapper">
              <FaCalendarCheck className="card-icon" />
              <h3>Attendance Summary</h3>
            </div>
            <Link to="/reports/attendance" className="view-all-link">
              <FaEye /> View Details
            </Link>
          </div>

          <div className="card-body">
            <div className="attendance-stats">
              <div className="stat-item">
                <span className="stat-label">Overall Attendance</span>
                <span className="stat-value large">
                  {attendanceData?.percentage || 0}%
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Sessions</span>
                <span className="stat-value">
                  {attendanceData?.totalSessions || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Avg Attendance</span>
                <span className="stat-value">
                  {attendanceData?.averageAttendance || 0}
                </span>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={attendanceLineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    name="Attendance %"
                    stroke="#1a4b6d"
                    fill="#1a4b6d"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ================= LOW ATTENDANCE STUDENTS ================= */}
        <div className="report-card low-attendance-card fade-in-up">
          <div className="card-header">
            <div className="card-title-wrapper">
              <FaExclamationTriangle className="card-icon" />
              <h3>Low Attendance Students</h3>
            </div>
            <select
              value={attendanceCourseFilter}
              onChange={(e) => setAttendanceCourseFilter(e.target.value)}
              className="filter-select-small"
            >
              <option value="">All Courses</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Information Technology">IT</option>
              <option value="Mechanical Engineering">Mechanical</option>
            </select>
          </div>

          <div className="card-body">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Course</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLowAttendance.map((student) => (
                    <tr
                      key={student._id}
                      className={student.attendance < 60 ? "critical-row" : ""}
                    >
                      <td className="student-name">{student.name}</td>
                      <td>{student.course}</td>
                      <td>
                        <div className="attendance-bar-wrapper">
                          <div
                            className={`attendance-bar ${
                              student.attendance < 60 ? "critical" : "warning"
                            }`}
                            style={{ width: `${student.attendance}%` }}
                          />
                        </div>
                        <span className="attendance-percentage">
                          {student.attendance}%
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${getStatusBadgeClass(
                            student.status
                          )}`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn-action">
                          <FaEye /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        /* ================= CONTAINER ================= */
        .report-dashboard-container {
          padding: 1.5rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          min-height: 100vh;
        }

        /* ================= LOADING & ERROR ================= */
        .reports-loading,
        .reports-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          gap: 1rem;
        }

        .loading-spinner .spin-icon {
          font-size: 4rem;
          color: #1a4b6d;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .reports-error .error-icon {
          font-size: 4rem;
          color: #dc3545;
        }

        .retry-btn {
          padding: 0.75rem 1.5rem;
          background: #1a4b6d;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        /* ================= TOAST ================= */
        .toast-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          z-index: 9999;
          animation: slideIn 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .toast-notification.success {
          background: #28a745;
        }

        .toast-notification.error {
          background: #dc3545;
        }

        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
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

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon {
          font-size: 3rem;
          color: #1a4b6d;
        }

        .dashboard-title {
          margin: 0;
          font-size: 1.75rem;
          color: #1a4b6d;
        }

        .dashboard-subtitle {
          margin: 0.25rem 0 0;
          color: #6c757d;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .btn-refresh,
        .btn-export {
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          border: none;
          transition: all 0.3s ease;
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

        .btn-export {
          background: linear-gradient(135deg, #1a4b6d 0%, #2d6f8f 100%);
          color: white;
        }

        /* ================= SUMMARY CARDS ================= */
        .summary-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .summary-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }

        .summary-card.warning {
          border-left: 4px solid #fd7e14;
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

        .card-icon-wrapper.blue {
          background: linear-gradient(135deg, #007bff, #0056b3);
        }
        .card-icon-wrapper.green {
          background: linear-gradient(135deg, #28a745, #1e7e34);
        }
        .card-icon-wrapper.purple {
          background: linear-gradient(135deg, #6f42c1, #4a2d8a);
        }
        .card-icon-wrapper.orange {
          background: linear-gradient(135deg, #fd7e14, #c95d0a);
        }

        .card-content {
          flex: 1;
        }

        .card-content h3 {
          margin: 0;
          font-size: 1.75rem;
          color: #1a4b6d;
          font-weight: 700;
        }

        .card-content p {
          margin: 0.25rem 0 0;
          font-size: 0.9rem;
          color: #6c757d;
        }

        /* Blinking Effects */
        .blink-effect {
          animation: cardPulse 2s ease-in-out infinite;
        }

        .icon-blink {
          animation: iconPulse 2s ease-in-out infinite;
        }

        .value-blink {
          animation: valuePulse 2s ease-in-out infinite;
        }

        @keyframes cardPulse {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            transform: translateY(0);
          }
          50% {
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            transform: translateY(-3px);
          }
        }

        @keyframes iconPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        @keyframes valuePulse {
          0%, 100% {
            color: #1a4b6d;
            transform: scale(1);
          }
          50% {
            color: #2d6f8f;
            transform: scale(1.05);
          }
        }

        /* ================= REPORTS GRID ================= */
        .reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 1.5rem;
        }

        /* ================= CARD STYLES ================= */
        .report-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .report-card:hover {
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

        /* ================= ADMISSION STATS ================= */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .stat-icon {
          font-size: 1.5rem;
        }

        .stat-icon.approved {
          color: #28a745;
        }
        .stat-icon.pending {
          color: #ffc107;
        }
        .stat-icon.rejected {
          color: #dc3545;
        }

        .stat-box > div {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a4b6d;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6c757d;
        }

        .stat-percentage {
          font-size: 0.75rem;
          font-weight: 600;
          color: #1a4b6d;
        }

        /* ================= PAYMENT OVERVIEW ================= */
        .payment-overview {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .payment-stat {
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          text-align: center;
        }

        .payment-stat.collected {
          background: #d4edda;
        }

        .payment-stat.pending {
          background: #fff3cd;
        }

        .payment-stat.rate {
          background: #d1ecf1;
        }

        .payment-label {
          display: block;
          font-size: 0.75rem;
          color: #6c757d;
          margin-bottom: 0.5rem;
        }

        .payment-value {
          display: block;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1a4b6d;
        }

        /* ================= CHART CONTAINER ================= */
        .chart-container {
          margin-top: 1.5rem;
        }

        /* ================= ATTENDANCE STATS ================= */
        .attendance-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-item {
          text-align: center;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .stat-item .stat-label {
          display: block;
          font-size: 0.85rem;
          color: #6c757d;
          margin-bottom: 0.5rem;
        }

        .stat-item .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a4b6d;
        }

        .stat-item .stat-value.large {
          font-size: 2rem;
          color: #28a745;
        }

        /* ================= FILTERS ================= */
        .filters-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .filter-group {
          flex: 1;
          min-width: 200px;
          position: relative;
        }

        .filter-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: border-color 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #1a4b6d;
        }

        .filter-select,
        .filter-select-small {
          padding: 0.75rem 1rem;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 0.9rem;
          cursor: pointer;
          background: white;
          transition: border-color 0.3s ease;
        }

        .filter-select:focus,
        .filter-select-small:focus {
          outline: none;
          border-color: #1a4b6d;
        }

        .btn-filter {
          padding: 0.75rem 1.25rem;
          background: #f8f9fa;
          border: 2px solid #1a4b6d;
          color: #1a4b6d;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .btn-filter:hover {
          background: #1a4b6d;
          color: white;
        }

        /* ================= TABLE ================= */
        .table-responsive {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th,
        .data-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e9ecef;
        }

        .data-table th {
          background: #f8f9fa;
          font-weight: 700;
          color: #1a4b6d;
          font-size: 0.85rem;
          text-transform: uppercase;
        }

        .data-table tbody tr:hover {
          background: #f8f9fa;
        }

        .student-name {
          font-weight: 600;
          color: #1a4b6d;
        }

        .text-success {
          color: #28a745;
          font-weight: 600;
        }

        .text-danger {
          color: #dc3545;
          font-weight: 600;
        }

        /* ================= STATUS BADGES ================= */
        .status-badge {
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .badge-paid {
          background: #d4edda;
          color: #155724;
        }

        .badge-partial {
          background: #fff3cd;
          color: #856404;
        }

        .badge-due {
          background: #f8d7da;
          color: #721c24;
        }

        .badge-warning {
          background: #fff3cd;
          color: #856404;
        }

        .badge-critical {
          background: #f8d7da;
          color: #721c24;
        }

        /* ================= ATTENDANCE BAR ================= */
        .attendance-bar-wrapper {
          width: 100%;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .attendance-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .attendance-bar.warning {
          background: #ffc107;
        }

        .attendance-bar.critical {
          background: #dc3545;
        }

        .attendance-percentage {
          font-size: 0.85rem;
          font-weight: 600;
        }

        .critical-row {
          background: #fff5f5 !important;
        }

        .btn-action {
          padding: 0.5rem 1rem;
          background: #1a4b6d;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .btn-action:hover {
          background: #2d6f8f;
        }

        /* ================= ANIMATIONS ================= */
        .fade-in {
          animation: fadeIn 0.6s ease forwards;
        }

        .fade-in-up {
          animation: fadeInUp 0.6s ease forwards;
          opacity: 0;
        }

        .fade-in-up:nth-child(1) {
          animation-delay: 0.1s;
        }
        .fade-in-up:nth-child(2) {
          animation-delay: 0.2s;
        }
        .fade-in-up:nth-child(3) {
          animation-delay: 0.3s;
        }
        .fade-in-up:nth-child(4) {
          animation-delay: 0.4s;
        }
        .fade-in-up:nth-child(5) {
          animation-delay: 0.5s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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

        /* ================= RESPONSIVE ================= */
        @media (max-width: 768px) {
          .report-dashboard-container {
            padding: 1rem;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .header-content {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
            justify-content: center;
          }

          .summary-cards-grid {
            grid-template-columns: 1fr;
          }

          .reports-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid,
          .payment-overview,
          .attendance-stats {
            grid-template-columns: 1fr;
          }

          .filters-row {
            flex-direction: column;
          }

          .filter-group {
            min-width: 100%;
          }

          .data-table th,
          .data-table td {
            padding: 0.75rem 0.5rem;
            font-size: 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .dashboard-title {
            font-size: 1.5rem;
          }

          .header-icon {
            font-size: 2.5rem;
          }

          .card-header {
            flex-direction: column;
            gap: 0.75rem;
            text-align: center;
          }

          .chart-container {
            height: 200px;
          }
        }
      `}</style>
    </div>
  );
}