import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import ApiError from "../../../../components/ApiError";
import ExportButtons from "../../../../components/ExportButtons";
import Pagination from "../../../../components/Pagination";
import { toast } from "react-toastify";
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
  FaSyncAlt,
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

/* ================= CONSTANTS & CONFIGURATION ================= */
const CONFIG = {
  ITEMS_PER_PAGE: 5,
  CHART: {
    PIE: { innerRadius: 70, outerRadius: 110, height: 280 },
    BAR: { height: 280 },
    AREA: { height: 280, domain: [0, 100] },
    LINE: { height: 280 },
  },
  // Sidebar-matched theme colors
  THEME: {
    PRIMARY: "#0f3a4a",
    PRIMARY_DARK: "#0c2d3a",
    PRIMARY_LIGHT: "#1a4b6d",
    ACCENT: "#3db5e6",
    ACCENT_LIGHT: "#4fc3f7",
    SUCCESS: "#28a745",
    WARNING: "#ffc107",
    DANGER: "#dc3545",
    INFO: "#17a2b8",
  },
  // Chart colors matching theme
  CHART_COLORS: {
    APPROVED: "#28a745",
    PENDING: "#ffc107",
    REJECTED: "#dc3545",
    COLLECTED: "#28a745",
    PENDING_FEE: "#dc3545",
    ATTENDANCE: "#0f3a4a",
    PRIMARY: "#0f3a4a",
    ACCENT: "#3db5e6",
    GRADIENTS: {
      PRIMARY: "linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%)",
      SUCCESS: "linear-gradient(135deg, #28a745 0%, #1e7e34 100%)",
      WARNING: "linear-gradient(135deg, #ffc107 0%, #ff9800 100%)",
      DANGER: "linear-gradient(135deg, #dc3545 0%, #c62828 100%)",
      INFO: "linear-gradient(135deg, #17a2b8 0%, #00838f 100%)",
    },
  },
  COURSES: [
    "Computer Science",
    "Information Technology",
    "Mechanical Engineering",
  ],
  PAYMENT_STATUS: ["PAID", "PARTIAL", "DUE"],
  TOAST: {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "colored",
  },
};

export default function ReportDashboard() {
  // ================= STATE MANAGEMENT =================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false); // Prevent duplicate toasts
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

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

  // Pagination States
  const [currentPaymentPage, setCurrentPaymentPage] = useState(1);
  const [currentLowAttendancePage, setCurrentLowAttendancePage] = useState(1);
  const [itemsPerPage] = useState(CONFIG.ITEMS_PER_PAGE);

  // ================= EXPORT HELPER FUNCTIONS =================
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

  // Prepare admission data for export
  const getAdmissionExportData = () => {
    if (!admissionData) return [];
    return [
      { metric: "Total Students", value: admissionData.total || 0 },
      { metric: "Approved", value: admissionData.approved || 0 },
      { metric: "Pending", value: admissionData.pending || 0 },
      { metric: "Rejected", value: admissionData.rejected || 0 },
      {
        metric: "Approval Rate",
        value: `${admissionData.approvedPercentage || 0}%`,
      },
      {
        metric: "Pending Rate",
        value: `${admissionData.pendingPercentage || 0}%`,
      },
    ];
  };

  // Prepare payment data for export
  const getPaymentExportData = () => {
    if (!paymentData) return [];
    return [
      {
        metric: "Total Expected Fee",
        value: formatCurrency(paymentData.total || 0),
      },
      {
        metric: "Total Collected",
        value: formatCurrency(
          paymentData.collected || paymentData.totalCollected || 0,
        ),
      },
      {
        metric: "Total Pending",
        value: formatCurrency(paymentData.pending || 0),
      },
      {
        metric: "Collection Rate",
        value: `${paymentData.collectionRate || 0}%`,
      },
    ];
  };

  // Prepare student payment details for export
  const getStudentPaymentsExportData = () => {
    return filteredStudentPayments.map((student) => ({
      name: student.name,
      course: student.course,
      totalFee: formatCurrency(student.totalFee),
      paid: formatCurrency(student.paid),
      pending: formatCurrency(student.pending),
      status: student.status,
    }));
  };

  // Prepare attendance data for export
  const getAttendanceExportData = () => {
    if (!attendanceData) return [];
    return [
      {
        metric: "Overall Attendance",
        value: `${attendanceData.percentage || attendanceData.attendancePercentage || 0}%`,
      },
      {
        metric: "Total Sessions",
        value: attendanceData.totalSessions || attendanceData.total || 0,
      },
      {
        metric: "Average Attendance",
        value: attendanceData.averageAttendance || attendanceData.present || 0,
      },
    ];
  };

  // Prepare low attendance students data for export
  const getLowAttendanceExportData = () => {
    return filteredLowAttendance.map((student) => ({
      name: student.name,
      course: student.course,
      attendance: `${student.attendance}%`,
      status: student.status,
    }));
  };

  // ================= FETCH DATA =================
  const fetchAllReports = useCallback(async () => {
    // Prevent duplicate fetches
    if (hasLoaded) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all reports in parallel from API endpoints
      const [
        admissionRes,
        paymentRes,
        attendanceRes,
        studentPaymentsRes,
        lowAttendanceRes,
      ] = await Promise.all([
        api.get("/reports/admissions/college-admin-summary"),
        api.get("/reports/payments/summary"),
        api.get("/reports/attendance/summary"),
        api.get("/reports/payments/students"),
        api.get("/reports/attendance/low-attendance"),
      ]);

      setAdmissionData(admissionRes.data);
      setPaymentData(paymentRes.data);

      // Fix: Attendance API returns array, extract first element
      const attendanceData = Array.isArray(attendanceRes.data)
        ? attendanceRes.data[0] || {}
        : attendanceRes.data;
      setAttendanceData(attendanceData);

      // Use real API data for student payments
      if (studentPaymentsRes.data && Array.isArray(studentPaymentsRes.data)) {
        setStudentPayments(studentPaymentsRes.data);
      } else {
        setStudentPayments([]);
      }

      // Use real API data for low attendance students
      if (
        lowAttendanceRes.data &&
        Array.isArray(lowAttendanceRes.data) &&
        lowAttendanceRes.data.length > 0
      ) {
        setLowAttendanceStudents(lowAttendanceRes.data);
      } else {
        setLowAttendanceStudents([]);
      }

      // Show success toast with unique toastId to prevent duplicates
      toast.success("Reports loaded successfully!", {
        ...CONFIG.TOAST,
        toastId: "reports-loaded-success",
      });
      setHasLoaded(true); // Mark as loaded to prevent duplicate toasts
    } catch (err) {
      console.error("Error fetching reports:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to load reports. Please try again.";
      const statusCode = err.response?.status;
      setError({ message: errorMessage, statusCode });
      // Show error toast with unique toastId to prevent duplicates
      toast.error(errorMessage, {
        ...CONFIG.TOAST,
        toastId: "reports-load-error",
      });
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [hasLoaded]);

  // Handle retry action
  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    setError(null);
    setHasLoaded(false);
    await fetchAllReports();
    setIsRetrying(false);
  };

  // Handle go back action
  const handleGoBack = () => {
    navigate(-1);
  };

  // Fetch data on mount only once
  useEffect(() => {
    fetchAllReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ================= FILTER FUNCTIONS (MEMOIZED) =================
  // Calculate payment status based on paid amount vs total fee
  const calculatePaymentStatus = (paid, totalFee) => {
    const paidAmount = Number(paid) || 0;
    const totalAmount = Number(totalFee) || 0;

    if (totalAmount === 0) return "N/A";
    if (paidAmount >= totalAmount) return "PAID";
    if (paidAmount === 0) return "DUE";
    return "PARTIAL";
  };

  const filteredStudentPayments = useMemo(() => {
    return studentPayments
      .map((student) => ({
        ...student,
        calculatedStatus: calculatePaymentStatus(
          student.paid,
          student.totalFee,
        ),
      }))
      .filter((student) => {
        const matchesCourse = courseFilter
          ? student.course === courseFilter
          : true;
        const matchesStatus = paymentStatusFilter
          ? student.calculatedStatus === paymentStatusFilter
          : true;
        const matchesSearch = searchQuery
          ? student.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true;
        return matchesCourse && matchesStatus && matchesSearch;
      });
  }, [studentPayments, courseFilter, paymentStatusFilter, searchQuery]);

  const filteredLowAttendance = useMemo(() => {
    return lowAttendanceStudents.filter((student) => {
      const matchesCourse = attendanceCourseFilter
        ? student.course === attendanceCourseFilter
        : true;
      return matchesCourse;
    });
  }, [lowAttendanceStudents, attendanceCourseFilter]);

  // ================= PAGINATION CALCULATIONS (MEMOIZED) =================
  const paymentPagination = useMemo(() => {
    const totalPages = Math.ceil(filteredStudentPayments.length / itemsPerPage);
    const startIndex = (currentPaymentPage - 1) * itemsPerPage;
    const endIndex = Math.min(
      startIndex + itemsPerPage,
      filteredStudentPayments.length,
    );
    return {
      totalPages,
      startIndex,
      endIndex,
      data: filteredStudentPayments.slice(startIndex, endIndex),
    };
  }, [filteredStudentPayments, itemsPerPage, currentPaymentPage]);

  const lowAttendancePagination = useMemo(() => {
    const totalPages = Math.ceil(filteredLowAttendance.length / itemsPerPage);
    const startIndex = (currentLowAttendancePage - 1) * itemsPerPage;
    const endIndex = Math.min(
      startIndex + itemsPerPage,
      filteredLowAttendance.length,
    );
    return {
      totalPages,
      startIndex,
      endIndex,
      data: filteredLowAttendance.slice(startIndex, endIndex),
    };
  }, [filteredLowAttendance, itemsPerPage, currentLowAttendancePage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPaymentPage(1);
  }, [searchQuery, courseFilter, paymentStatusFilter]);

  useEffect(() => {
    setCurrentLowAttendancePage(1);
  }, [attendanceCourseFilter]);

  // ================= CHART DATA (MEMOIZED) =================
  const admissionPieData = useMemo(() => {
    if (!admissionData) return [];
    return [
      {
        name: "Approved",
        value: admissionData.approved || 0,
        color: CONFIG.CHART_COLORS.APPROVED,
      },
      {
        name: "Pending",
        value: admissionData.pending || 0,
        color: CONFIG.CHART_COLORS.PENDING,
      },
      {
        name: "Rejected",
        value: admissionData.rejected || 0,
        color: CONFIG.CHART_COLORS.REJECTED,
      },
    ];
  }, [admissionData]);

  const paymentBarData = useMemo(() => {
    if (!paymentData && studentPayments.length === 0) return [];

    // Calculate from API or fallback to student payments
    const collected =
      paymentData?.collected ||
      paymentData?.totalCollected ||
      studentPayments.reduce(
        (sum, student) => sum + (Number(student.paid) || 0),
        0,
      );
    const total =
      paymentData?.total ||
      paymentData?.totalExpected ||
      studentPayments.reduce(
        (sum, student) => sum + (Number(student.totalFee) || 0),
        0,
      );
    const pending = total - collected;

    return [
      {
        name: "Collected",
        amount: collected,
        fill: CONFIG.CHART_COLORS.COLLECTED,
      },
      {
        name: "Pending",
        amount: pending,
        fill: CONFIG.CHART_COLORS.PENDING_FEE,
      },
    ];
  }, [paymentData, studentPayments]);

  const attendanceLineData = useMemo(() => {
    return (
      attendanceData?.trend || [
        { month: "Jan", attendance: 75 },
        { month: "Feb", attendance: 78 },
        { month: "Mar", attendance: 82 },
        { month: "Apr", attendance: 80 },
        { month: "May", attendance: 85 },
        { month: "Jun", attendance: 88 },
      ]
    );
  }, [attendanceData?.trend]);

  // ================= LOADING STATE =================
  if (loading) {
    return (
      <Loading
        size="lg"
        color="primary"
        text="Loading reports dashboard..."
        fullScreen={true}
      />
    );
  }

  // ================= ERROR STATE =================
  if (error) {
    return (
      <ApiError
        title="Error Loading Reports"
        message={error.message || "Failed to load reports. Please try again."}
        statusCode={error.statusCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={isRetrying}
      />
    );
  }

  return (
    <div className="report-dashboard-container">
      {/* ================= HEADER ================= */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-icon-wrapper">
            <FaChartBar />
          </div>
          <div className="header-text">
            <h1 className="dashboard-title">Reports & Analytics Dashboard</h1>
            <p className="dashboard-subtitle">
              Comprehensive overview of college performance metrics
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn-refresh"
            onClick={fetchAllReports}
            aria-label="Refresh report data"
          >
            <FaSyncAlt className="spin-icon" /> Refresh Data
          </button>
          <button className="btn-export" aria-label="Export all reports">
            <FaDownload /> Export All
          </button>
        </div>
      </div>

      {/* ================= DYNAMIC SUMMARY CARDS ================= */}
      <div className="summary-cards-grid">
        {/* Total Applications Card */}
        <div className="summary-card">
          <div className="card-icon-wrapper primary">
            <FaUsers />
          </div>
          <div className="card-content">
            <h3>{admissionData?.total || 0}</h3>
            <p>Total Applications</p>
          </div>
        </div>

        {/* Total Collected Card */}
        <div className="summary-card">
          <div className="card-icon-wrapper success">
            <FaWallet />
          </div>
          <div className="card-content">
            <h3>
              {formatCurrency(
                paymentData?.collected ||
                  paymentData?.totalCollected ||
                  studentPayments.reduce(
                    (sum, student) => sum + (Number(student.paid) || 0),
                    0,
                  ),
              )}
            </h3>
            <p>Total Collected</p>
          </div>
        </div>

        {/* Avg Attendance Card */}
        <div className="summary-card">
          <div className="card-icon-wrapper info">
            <FaCalendarCheck />
          </div>
          <div className="card-content">
            <h3>
              {attendanceData?.averageAttendance !== undefined &&
              attendanceData?.averageAttendance !== null
                ? `${Math.round(attendanceData.averageAttendance)}%`
                : attendanceData?.percentage !== undefined
                  ? `${attendanceData.percentage}%`
                  : "0%"}
            </h3>
            <p>Avg Attendance</p>
          </div>
        </div>

        {/* Low Attendance Card */}
        <div className="summary-card warning">
          <div className="card-icon-wrapper warning">
            <FaExclamationTriangle />
          </div>
          <div className="card-content">
            <h3>{lowAttendanceStudents?.length || 0}</h3>
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
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <ExportButtons
                title="Admission Summary Report"
                columns={[
                  { header: "Metric", key: "metric" },
                  { header: "Value", key: "value" },
                ]}
                data={getAdmissionExportData()}
                filename="admission_summary"
                showCSV={false}
              />
            </div>
          </div>

          <div className="card-body">
            <div className="stats-grid">
              <div className="stat-box">
                <FaCheckCircle className="stat-icon approved" />
                <div>
                  <span className="stat-value">
                    {admissionData?.approved || 0}
                  </span>
                  <span className="stat-label">Approved</span>
                  <span className="stat-percentage">
                    {admissionData?.approvedPercentage || 0}%
                  </span>
                </div>
              </div>

              <div className="stat-box">
                <FaClock className="stat-icon pending" />
                <div>
                  <span className="stat-value">
                    {admissionData?.pending || 0}
                  </span>
                  <span className="stat-label">Pending</span>
                  <span className="stat-percentage">
                    {admissionData?.pendingPercentage || 0}%
                  </span>
                </div>
              </div>

              <div className="stat-box">
                <FaTimesCircle className="stat-icon rejected" />
                <div>
                  <span className="stat-value">
                    {admissionData?.rejected || 0}
                  </span>
                  <span className="stat-label">Rejected</span>
                  <span className="stat-percentage">
                    {admissionData?.rejectedPercentage || 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer
                width="100%"
                height={CONFIG.CHART.PIE.height}
              >
                <PieChart>
                  <Pie
                    data={admissionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={CONFIG.CHART.PIE.innerRadius}
                    outerRadius={CONFIG.CHART.PIE.outerRadius}
                    paddingAngle={5}
                    dataKey="value"
                    label={false}
                    labelLine={false}
                  >
                    {admissionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} (${name})`,
                      "Status",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      padding: "12px",
                      fontSize: "14px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry, index) => {
                      const data = admissionPieData[index];
                      return `${value}: ${data?.value || 0}`;
                    }}
                    wrapperStyle={{
                      paddingTop: "20px",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  />
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
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <ExportButtons
                title="Payment Summary Report"
                columns={[
                  { header: "Metric", key: "metric" },
                  { header: "Value", key: "value" },
                ]}
                data={getPaymentExportData()}
                filename="payment_summary"
                showCSV={false}
              />
            </div>
          </div>

          <div className="card-body">
            <div className="payment-overview">
              <div className="payment-stat">
                <span className="payment-label">Total Expected</span>
                <span className="payment-value">
                  {formatCurrency(
                    paymentData?.total ||
                      paymentData?.totalExpected ||
                      studentPayments.reduce(
                        (sum, student) => sum + (Number(student.totalFee) || 0),
                        0,
                      ),
                  )}
                </span>
              </div>
              <div className="payment-stat collected">
                <span className="payment-label">Total Collected</span>
                <span className="payment-value">
                  {formatCurrency(
                    paymentData?.collected ||
                      paymentData?.totalCollected ||
                      studentPayments.reduce(
                        (sum, student) => sum + (Number(student.paid) || 0),
                        0,
                      ),
                  )}
                </span>
              </div>
              <div className="payment-stat pending">
                <span className="payment-label">Total Pending</span>
                <span className="payment-value">
                  {formatCurrency(
                    paymentData?.pending ||
                      studentPayments.reduce(
                        (sum, student) => sum + (Number(student.totalFee) || 0),
                        0,
                      ) -
                        studentPayments.reduce(
                          (sum, student) => sum + (Number(student.paid) || 0),
                          0,
                        ),
                  )}
                </span>
              </div>
              <div className="payment-stat rate">
                <span className="payment-label">Collection Rate</span>
                <span className="payment-value">
                  {paymentData?.collectionRate ||
                    (studentPayments.length > 0
                      ? Math.round(
                          (studentPayments.reduce(
                            (sum, student) => sum + (Number(student.paid) || 0),
                            0,
                          ) /
                            studentPayments.reduce(
                              (sum, student) =>
                                sum + (Number(student.totalFee) || 0),
                              0,
                            )) *
                            100,
                        )
                      : 0)}
                  %
                </span>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer
                width="100%"
                height={CONFIG.CHART.BAR.height}
              >
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
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <ExportButtons
                title="Student Payment Status Report"
                columns={[
                  { header: "Student Name", key: "name" },
                  { header: "Course", key: "course" },
                  { header: "Total Fee", key: "totalFee" },
                  { header: "Paid", key: "paid" },
                  { header: "Pending", key: "pending" },
                  { header: "Status", key: "status" },
                ]}
                data={getStudentPaymentsExportData()}
                filename="student_payment_status"
              />
            </div>
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
                {CONFIG.COURSES.map((course, index) => (
                  <option key={`${course}-${index}`} value={course}>
                    {course}
                  </option>
                ))}
              </select>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                {CONFIG.PAYMENT_STATUS.map((status, index) => (
                  <option key={`${status}-${index}`} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Results count */}
            <div className="results-count">
              Showing {paymentPagination.data.length} of{" "}
              {filteredStudentPayments.length} students
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
                  {paymentPagination.data.map((student) => (
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
                            student.calculatedStatus,
                          )}`}
                        >
                          {student.calculatedStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {paymentPagination.totalPages > 1 && (
              <div className="card-footer-pagination">
                <Pagination
                  page={currentPaymentPage}
                  totalPages={paymentPagination.totalPages}
                  setPage={setCurrentPaymentPage}
                />
              </div>
            )}
          </div>
        </div>

        {/* ================= ATTENDANCE SUMMARY ================= */}
        <div className="report-card attendance-card fade-in-up">
          <div className="card-header">
            <div className="card-title-wrapper">
              <FaCalendarCheck className="card-icon" />
              <h3>Attendance Summary</h3>
            </div>
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <ExportButtons
                title="Attendance Summary Report"
                columns={[
                  { header: "Metric", key: "metric" },
                  { header: "Value", key: "value" },
                ]}
                data={getAttendanceExportData()}
                filename="attendance_summary"
                showCSV={false}
              />
            </div>
          </div>

          <div className="card-body">
            <div className="attendance-stats">
              <div className="stat-item">
                <span className="stat-label">Overall Attendance</span>
                <span className="stat-value large">
                  {attendanceData?.averageAttendance !== undefined &&
                  attendanceData?.averageAttendance !== null
                    ? `${Math.round(attendanceData.averageAttendance)}%`
                    : attendanceData?.percentage !== undefined
                      ? `${attendanceData.percentage}%`
                      : "0%"}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Sessions</span>
                <span className="stat-value">
                  {attendanceData?.totalSessions !== undefined &&
                  attendanceData?.totalSessions !== null
                    ? attendanceData.totalSessions
                    : attendanceData?.totalRecords !== undefined
                      ? attendanceData.totalRecords
                      : attendanceData?.total || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Avg Attendance</span>
                <span className="stat-value">
                  {attendanceData?.averageAttendance !== undefined &&
                  attendanceData?.averageAttendance !== null
                    ? Math.round(attendanceData.averageAttendance)
                    : attendanceData?.present !== undefined
                      ? Math.round(attendanceData.present)
                      : 0}
                </span>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer
                width="100%"
                height={CONFIG.CHART.AREA.height}
              >
                <AreaChart data={attendanceLineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="month" />
                  <YAxis domain={CONFIG.CHART.AREA.domain} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    name="Attendance %"
                    stroke={CONFIG.CHART_COLORS.PRIMARY}
                    fill={CONFIG.CHART_COLORS.PRIMARY}
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
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <ExportButtons
                title="Low Attendance Students Report"
                columns={[
                  { header: "Student Name", key: "name" },
                  { header: "Course", key: "course" },
                  { header: "Attendance %", key: "attendance" },
                  { header: "Status", key: "status" },
                ]}
                data={getLowAttendanceExportData()}
                filename="low_attendance_students"
              />
              <select
                value={attendanceCourseFilter}
                onChange={(e) => setAttendanceCourseFilter(e.target.value)}
                className="filter-select-small"
                style={{ marginLeft: "0.5rem" }}
              >
                <option value="">All Courses</option>
                {CONFIG.COURSES.map((course, index) => (
                  <option key={`${course}-${index}-attendance`} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card-body">
            {lowAttendancePagination.data.length === 0 ? (
              <div
                className="empty-state"
                style={{ padding: "3rem", textAlign: "center" }}
              >
                <FaExclamationTriangle
                  style={{
                    fontSize: "3rem",
                    color: "#ffc107",
                    marginBottom: "1rem",
                  }}
                />
                <h3>No Low Attendance Students</h3>
                <p style={{ color: "#6c757d" }}>
                  {lowAttendanceStudents.length === 0
                    ? "All students have attendance above 75%. Great job!"
                    : "No students match the current filter."}
                </p>
              </div>
            ) : (
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
                    {lowAttendancePagination.data.map((student) => (
                      <tr
                        key={student._id || student.name}
                        className={
                          student.attendance < 60 ? "critical-row" : ""
                        }
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
                              student.status,
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
            )}

            {/* Pagination */}
            {lowAttendancePagination.totalPages > 1 && (
              <div className="card-footer-pagination">
                <Pagination
                  page={currentLowAttendancePage}
                  totalPages={lowAttendancePagination.totalPages}
                  setPage={setCurrentLowAttendancePage}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        /* ================= DESIGN SYSTEM - SIDEBAR THEME MATCH ================= */
        :root {
          --primary-dark: #0c2d3a;
          --primary: #0f3a4a;
          --primary-light: #1a4b6d;
          --accent: #3db5e6;
          --accent-light: #4fc3f7;
          --success: #28a745;
          --warning: #ffc107;
          --danger: #dc3545;
          --info: #17a2b8;
          --text-primary: #212529;
          --text-secondary: #6c757d;
          --bg-light: #f8f9fa;
          --border-light: #e9ecef;
          --shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
          --shadow-md: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
          --shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175);
          --radius-sm: 0.375rem;
          --radius-md: 0.5rem;
          --radius-lg: 0.75rem;
          /* Sidebar Font Theme */
          --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          --font-size-xs: 0.75rem;
          --font-size-sm: 0.875rem;
          --font-size-base: 1rem;
          --font-size-lg: 1.125rem;
          --font-size-xl: 1.25rem;
          --font-weight-normal: 400;
          --font-weight-medium: 500;
          --font-weight-semibold: 600;
          --font-weight-bold: 700;
          --line-height-base: 1.5;
        }

        /* ================= CONTAINER ================= */
        .report-dashboard-container {
          padding: 1.5rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          min-height: 100vh;
          font-family: var(--font-family-base);
          font-size: var(--font-size-base);
          line-height: var(--line-height-base);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
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

        .reports-error .error-icon {
          font-size: 4rem;
          color: var(--danger);
        }

        .retry-btn {
          padding: 0.75rem 1.5rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .retry-btn:hover {
          background: var(--primary-dark);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        /* ================= HEADER - ENTERPRISE LAYOUT ================= */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.75rem;
          background: var(--primary);
          border-radius: var(--radius-lg);
          box-shadow: 0 8px 32px rgba(15, 58, 74, 0.3);
          color: white;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .header-icon-wrapper {
          width: 64px;
          height: 64px;
          background: rgba(61, 181, 230, 0.2);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: var(--accent-light);
        }

        .dashboard-title {
          margin: 0;
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
          color: white;
          font-family: var(--font-family-base);
        }

        .dashboard-subtitle {
          margin: 0.375rem 0 0;
          color: rgba(255, 255, 255, 0.9);
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-medium);
          font-family: var(--font-family-base);
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-refresh,
        .btn-export {
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-lg);
          font-weight: var(--font-weight-semibold);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          border: none;
          transition: all var(--transition-base);
          font-size: var(--font-size-sm);
          font-family: var(--font-family-base);
        }

        .btn-refresh {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn-refresh:hover {
          background: rgba(61, 181, 230, 0.25);
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(61, 181, 230, 0.3);
        }

        .btn-export {
          background: white;
          color: var(--primary);
        }

        .btn-export:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ================= SUMMARY CARDS - CLEAN DESIGN ================= */
        .summary-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
          background: white;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }

        .summary-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .summary-card.warning {
          border-left-color: var(--warning);
        }

        .card-icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          color: white;
          flex-shrink: 0;
        }

        .card-icon-wrapper.primary {
          background: var(--primary);
        }
        .card-icon-wrapper.success {
          background: var(--success);
        }
        .card-icon-wrapper.info {
          background: var(--info);
        }
        .card-icon-wrapper.warning {
          background: var(--warning);
        }

        .card-content {
          flex: 1;
        }

        .card-content h3 {
          margin: 0;
          font-size: var(--font-size-2xl);
          color: var(--primary);
          font-weight: var(--font-weight-bold);
          line-height: var(--line-height-base);
          font-family: var(--font-family-base);
        }

        .card-content p {
          margin: 0.375rem 0 0;
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          font-weight: var(--font-weight-medium);
          font-family: var(--font-family-base);
        }

        /* ================= REPORTS GRID ================= */
        .reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 1.5rem;
        }

        /* ================= CARD STYLES - ENTERPRISE ================= */
        .report-card {
          background: white;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .report-card:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 2px solid rgba(61, 181, 230, 0.2);
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.03) 0%, rgba(12, 45, 58, 0.05) 100%);
        }

        .card-title-wrapper {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .card-icon {
          font-size: 1.35rem;
          color: var(--primary);
        }

        .card-header h3 {
          margin: 0;
          font-size: var(--font-size-lg);
          color: var(--primary);
          font-weight: var(--font-weight-bold);
          font-family: var(--font-family-base);
        }

        .view-all-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--accent);
          text-decoration: none;
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          transition: all var(--transition-base);
          font-family: var(--font-family-base);
        }

        .view-all-link:hover {
          color: var(--primary);
          transform: translateX(2px);
        }

        .card-body {
          padding: 1.5rem;
        }

        /* ================= TABLE - ENTERPRISE DESIGN ================= */
        .table-responsive {
          overflow-x: auto;
          border-radius: var(--radius-sm);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .data-table th {
          padding: 1rem 1.25rem;
          text-align: left;
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--primary);
          background: rgba(15, 58, 74, 0.03);
          border-bottom: 2px solid rgba(61, 181, 230, 0.2);
          white-space: nowrap;
        }

        .data-table td {
          padding: 1rem 1.25rem;
          color: var(--text-primary);
          font-size: 0.9rem;
          border-bottom: 1px solid var(--border-light);
          vertical-align: middle;
        }

        .data-table tbody tr {
          transition: all 0.2s ease;
        }

        .data-table tbody tr:hover {
          background: rgba(61, 181, 230, 0.04);
        }

        .student-name {
          font-weight: var(--font-weight-semibold);
          color: var(--primary);
          font-size: var(--font-size-base);
          font-family: var(--font-family-base);
          letter-spacing: 0.3px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .text-success {
          color: var(--success) !important;
          font-weight: 600;
        }

        .text-danger {
          color: var(--danger) !important;
          font-weight: 600;
        }

        /* ================= STATUS BADGES ================= */
        .status-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-block;
        }

        .badge-paid {
          background: rgba(40, 167, 69, 0.12);
          color: var(--success);
        }

        .badge-partial {
          background: rgba(255, 193, 7, 0.12);
          color: #b8860b;
        }

        .badge-due {
          background: rgba(220, 53, 69, 0.12);
          color: var(--danger);
        }

        .badge-warning {
          background: rgba(255, 193, 7, 0.12);
          color: #b8860b;
        }

        .badge-critical {
          background: rgba(220, 53, 69, 0.12);
          color: var(--danger);
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

        .results-count {
          padding: 0.75rem 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1a4b6d;
          margin-bottom: 1rem;
        }

        .card-footer-pagination {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-top: 1px solid #e9ecef;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 -1.5rem -1.5rem;
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
