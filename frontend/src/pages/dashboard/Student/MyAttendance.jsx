import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaBookOpen,
  FaChartPie,
  FaUserGraduate,
  FaArrowLeft,
  FaInfoCircle,
  FaSync,
  FaDownload,
  FaPrint,
  FaBell,
  FaExclamationTriangle,
  FaGraduationCap,
  FaLayerGroup,
  FaClock,
  FaSpinner,
  FaEye,
} from "react-icons/fa";

export default function MyAttendance() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [overallStats, setOverallStats] = useState({
    totalLectures: 0,
    totalPresent: 0,
    totalAbsent: 0,
    overallPercentage: 0,
  });

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= FETCH STUDENT PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/students/my-profile");
        if (res.data?.student) {
          setStudentProfile(res.data.student);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        // Continue without profile - use AuthContext data
      }
    };
    fetchProfile();
  }, []);

  /* ================= FETCH ATTENDANCE ================= */
  const fetchAttendance = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/attendance/my-attendance/summary");

      if (!res.data || !Array.isArray(res.data.attendance)) {
        throw new Error("Invalid attendance data structure");
      }

      setAttendance(res.data.attendance || []);

      // Calculate overall statistics
      const totalLectures = res.data.attendance.reduce(
        (sum, sub) => sum + (sub.totalLectures || 0),
        0,
      );
      const totalPresent = res.data.attendance.reduce(
        (sum, sub) => sum + (sub.present || 0),
        0,
      );
      const totalAbsent = res.data.attendance.reduce(
        (sum, sub) => sum + (sub.absent || 0),
        0,
      );
      const overallPercentage =
        totalLectures > 0
          ? Math.round((totalPresent / totalLectures) * 100)
          : 0;

      setOverallStats({
        totalLectures,
        totalPresent,
        totalAbsent,
        overallPercentage,
      });
    } catch (err) {
      console.error("Attendance fetch error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load attendance data. Please try again.",
      );
      toastError(
        err.response?.data?.message || "Failed to load attendance data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  /* ================= TOAST FUNCTION ================= */
  const toastError = (message) => {
    // Simple alert since we don't have react-toastify imported
    console.error(message);
  };

  /* ================= GET ATTENDANCE COLOR ================= */
  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return "success";
    if (percentage >= 60) return "warning";
    return "danger";
  };

  /* ================= GET ATTENDANCE STATUS ================= */
  const getAttendanceStatus = (percentage) => {
    if (percentage >= 75) return "Good Standing";
    if (percentage >= 60) return "Needs Attention";
    return "Critical - Below Minimum";
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
                <h5 className="text-muted">Loading Attendance Records...</h5>
                <p className="text-muted small">
                  Fetching your attendance data from all subjects
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
          <div className="col-md-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body text-center p-5">
                <div className="text-danger mb-3">
                  <FaTimesCircle size={64} />
                </div>
                <h4 className="fw-bold mb-2">Attendance Loading Error</h4>
                <p className="text-muted mb-4">{error}</p>
                <div className="d-flex justify-content-center gap-3">
                  <button
                    onClick={fetchAttendance}
                    className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2"
                  >
                    <FaSync className="spin-icon" /> Retry
                  </button>
                  <button
                    onClick={() => navigate("/student/dashboard")}
                    className="btn btn-outline-secondary px-4 py-2 d-flex align-items-center gap-2"
                  >
                    <FaArrowLeft /> Back to Dashboard
                  </button>
                </div>
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
          <div className="d-flex align-items-center gap-3">
            <div className="attendance-logo-container bg-gradient-primary text-white rounded-circle d-flex align-items-center justify-content-center pulse-icon">
              <FaCalendarAlt size={28} />
            </div>
            <div>
              <h1 className="h4 h3-md fw-bold mb-1 text-dark">My Attendance</h1>
              <p className="text-muted mb-0 small">
                <FaGraduationCap className="me-1" />
                {studentProfile?.fullName || user.name || "Student"} | Overall:{" "}
                {overallStats.overallPercentage}%
              </p>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="btn btn-outline-info d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Attendance Help"
          >
            <FaInfoCircle size={16} /> Help
          </button>

          <button
            onClick={fetchAttendance}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Refresh Attendance"
            disabled={loading}
          >
            <FaSync className={loading ? "spin-icon" : ""} size={16} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <div className="dropdown">
            <button
              className="btn btn-outline-primary d-flex align-items-center gap-2 px-3 py-2 hover-lift dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <FaDownload size={16} /> Export
            </button>
            <ul className="dropdown-menu">
              <li>
                <button
                  className="dropdown-item d-flex align-items-center gap-2"
                  onClick={() => window.print()}
                >
                  <FaPrint /> Print Report
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ================= HELP SECTION ================= */}
      {showHelp && (
        <div className="alert alert-info border-0 bg-info bg-opacity-10 rounded-4 mb-3 mb-md-4 animate-fade-in">
          <div className="d-flex align-items-start gap-2">
            <FaInfoCircle className="mt-1 flex-shrink-0" size={20} />
            <div>
              <h6 className="fw-bold mb-1">Attendance Dashboard Guide</h6>
              <ul className="mb-0 small ps-3">
                <li>
                  <strong>Overall Attendance</strong>: Combined percentage
                  across all subjects
                </li>
                <li>
                  <strong>Subject Breakdown</strong>: Detailed attendance per
                  subject with color-coded status
                </li>
                <li>
                  <strong>Status Indicators</strong>:
                  <ul className="mt-1 mb-0 ps-3">
                    <li>
                      <span className="badge bg-success me-1">≥75%</span> - Good
                      Standing (Meets requirement)
                    </li>
                    <li>
                      <span className="badge bg-warning me-1">60-74%</span> -
                      Needs Attention (Below requirement)
                    </li>
                    <li>
                      <span className="badge bg-danger me-1">&lt;60%</span> -
                      Critical (At risk of debarment)
                    </li>
                  </ul>
                </li>
                <li>
                  Click <FaEye className="mx-1" /> icon to view detailed session
                  history for any subject
                </li>
                <li>
                  Attendance is updated in real-time after each class session
                </li>
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

      {/* ================= STUDENT HEADER CARD ================= */}
      <div
        className="card border-0 shadow-lg rounded-4 overflow-hidden mb-3 mb-md-4 animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="card-header bg-gradient-primary text-white py-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between">
            <div className="d-flex align-items-center gap-4 mb-3 mb-md-0">
              <div className="profile-avatar-container">
                <div className="profile-avatar bg-white d-flex align-items-center justify-content-center text-primary">
                  <FaUserGraduate size={48} />
                </div>
              </div>
              <div>
                <h2 className="h4 fw-bold mb-1">
                  {studentProfile?.fullName || user.name || "Student Name"}
                </h2>
                <div className="d-flex flex-wrap gap-3">
                  <div className="d-flex align-items-center gap-1">
                    <span className="opacity-75">
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <FaLayerGroup className="text-white opacity-75" />
                    <span className="opacity-75">
                      Semester {studentProfile?.currentSemester || "N/A"}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <FaUserGraduate className="text-white opacity-75" />
                    <span className="opacity-75">
                      {studentProfile?.enrollmentNumber || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  <div className="d-flex align-items-center gap-2">
                    <FaBookOpen className="text-white opacity-75" />
                    <span className="opacity-75">
                      Subjects: {attendance.length}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <FaCalendarAlt className="text-white opacity-75" />
                    <span className="opacity-75">Academic Year: 2025-2026</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex flex-column flex-md-row gap-2 mt-3 mt-md-0">
              <button
                className="btn btn-light d-flex align-items-center gap-2 px-4 py-2"
                onClick={() => navigate("/student/profile")}
              >
                <FaUserGraduate /> View Profile
              </button>
              <button
                className="btn btn-outline-light d-flex align-items-center gap-2 px-4 py-2"
                onClick={() => window.print()}
              >
                <FaPrint /> Print Report
              </button>
            </div>
          </div>
        </div>
        <div className="card-body bg-light py-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center text-center text-md-start">
            <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-4 mb-2 mb-md-0">
              <div className="d-flex align-items-center gap-2">
                <FaCheckCircle className="text-success" />
                <span className="fw-medium">
                  Total Present: {overallStats.totalPresent}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <FaTimesCircle className="text-danger" />
                <span className="fw-medium">
                  Total Absent: {overallStats.totalAbsent}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <FaBookOpen className="text-primary" />
                <span className="fw-medium">
                  Total Lectures: {overallStats.totalLectures}
                </span>
              </div>
            </div>
            <small className="text-muted">
              <FaSync className="spin-icon me-1" />
              Last updated: {new Date().toLocaleString()}
            </small>
          </div>
        </div>
      </div>

      {/* ================= OVERALL ATTENDANCE CARD ================= */}
      <div
        className="card border-0 shadow-lg rounded-4 overflow-hidden mb-3 mb-md-4 animate-fade-in-up"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="card-header bg-light py-3">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <FaChartPie /> Overall Attendance Summary
          </h5>
        </div>
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-md-row align-items-center justify-content-between">
            <div className="text-center mb-4 mb-md-0">
              <div className="overall-percentage-circle">
                <div className="percentage-text">
                  {overallStats.overallPercentage}%
                </div>
              </div>
              <h6 className="mt-3 fw-bold">Overall Attendance</h6>
              <span
                className={`badge bg-${getAttendanceColor(overallStats.overallPercentage)} mt-2`}
              >
                {getAttendanceStatus(overallStats.overallPercentage)}
              </span>
            </div>

            <div className="w-100 mt-4 mt-md-0">
              <div className="d-flex justify-content-between mb-2">
                <span className="fw-semibold">Attendance Progress</span>
                <span className="fw-bold text-primary">
                  {overallStats.overallPercentage}%
                </span>
              </div>
              <div
                className="progress"
                style={{
                  height: "24px",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  className={`progress-bar ${overallStats.overallPercentage >= 75 ? "bg-success" : overallStats.overallPercentage >= 60 ? "bg-warning" : "bg-danger"}`}
                  role="progressbar"
                  style={{ width: `${overallStats.overallPercentage}%` }}
                >
                  <div className="progress-text">
                    {overallStats.overallPercentage}%
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-between mt-3 text-muted small">
                <div>
                  <FaCheckCircle className="me-1 text-success" />
                  {overallStats.totalPresent} Present
                </div>
                <div>
                  <FaTimesCircle className="me-1 text-danger" />
                  {overallStats.totalAbsent} Absent
                </div>
                <div>
                  <FaBookOpen className="me-1 text-primary" />
                  {overallStats.totalLectures} Total
                </div>
              </div>
              <div className="alert alert-info bg-info bg-opacity-10 mt-4 p-3 rounded-3">
                <div className="d-flex align-items-start gap-2">
                  <FaBell className="mt-1 flex-shrink-0" />
                  <div>
                    <strong>Minimum Requirement:</strong> 75% attendance is
                    mandatory to be eligible for examinations.
                    {overallStats.overallPercentage < 75 && (
                      <>
                        <br />
                        <strong className="text-danger">
                          Action Required:
                        </strong>{" "}
                        Your current attendance is below minimum requirement.
                        Contact your department for attendance improvement plan.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= ATTENDANCE TABLE ================= */}
      <div
        className="card border-0 shadow-lg rounded-4 overflow-hidden animate-fade-in-up"
        style={{ animationDelay: "0.3s" }}
      >
        <div className="card-header bg-gradient-primary text-white py-3 py-md-4">
          <div className="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center gap-3">
            <h2 className="h5 h6-md fw-bold mb-0 d-flex align-items-center gap-2">
              <FaBookOpen /> Subject-wise Attendance
            </h2>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-light d-flex align-items-center gap-1">
                <FaDownload size={12} /> Export CSV
              </button>
              <button
                className="btn btn-sm btn-light d-flex align-items-center gap-1"
                onClick={() => window.print()}
              >
                <FaPrint size={12} /> Print
              </button>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {attendance.length === 0 ? (
            <div className="text-center py-5 px-3">
              <FaCalendarAlt className="text-muted mb-3" size={64} />
              <h5 className="text-muted mb-2">No Attendance Records Found</h5>
              <p className="text-muted mb-4">
                Your attendance records will appear here once teachers start
                marking attendance for your classes.
              </p>
              <button
                onClick={() => navigate("/student/timetable")}
                className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2 mx-auto"
              >
                <FaCalendarAlt /> View Timetable
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th width="5%" className="ps-4">
                      Sr.No
                    </th>
                    <th width="25%">
                      <FaBookOpen className="me-1" />
                      Subject
                    </th>
                    <th width="10%">Code</th>
                    <th width="12%" className="text-center">
                      <FaCalendarAlt className="me-1" />
                      Lectures
                    </th>
                    <th width="12%" className="text-center text-success">
                      <FaCheckCircle className="me-1" />
                      Present
                    </th>
                    <th width="12%" className="text-center text-danger">
                      <FaTimesCircle className="me-1" />
                      Absent
                    </th>
                    <th width="14%" className="text-center">
                      <FaChartPie className="me-1" />
                      Percentage
                    </th>
                    <th width="10%" className="text-center pe-4">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((subject, idx) => (
                    <tr
                      key={idx}
                      className={`animate-fade-in ${getAttendanceColor(subject.percentage) === "danger" ? "table-danger" : getAttendanceColor(subject.percentage) === "warning" ? "table-warning" : ""}`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <td className="ps-4 fw-medium">{idx + 1}</td>
                      <td>
                        <div className="fw-bold">{subject.subject}</div>
                        <small className="text-muted">
                          {subject.teacher || "N/A"}
                        </small>
                      </td>
                      <td className="fw-medium">
                        {subject.subjectCode || "N/A"}
                      </td>
                      <td className="text-center fw-medium">
                        {subject.totalLectures || 0}
                      </td>
                      <td className="text-center text-success fw-medium">
                        {subject.present || 0}
                      </td>
                      <td className="text-center text-danger fw-medium">
                        {subject.absent || 0}
                      </td>
                      <td className="text-center">
                        <div className="d-flex flex-column align-items-center">
                          <span
                            className={`badge bg-${getAttendanceColor(subject.percentage)} fw-bold`}
                          >
                            {subject.percentage || 0}%
                          </span>
                          <small
                            className={`mt-1 ${
                              subject.percentage < 60
                                ? "text-danger fw-semibold"
                                : subject.percentage < 75
                                  ? "text-warning"
                                  : "text-success"
                            }`}
                          >
                            {getAttendanceStatus(subject.percentage)}
                          </small>
                        </div>
                      </td>
                      <td className="text-center pe-4">
                        <button
                          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 mx-auto"
                          onClick={() =>
                            navigate(
                              `/student/my-attendance/${subject.subjectCode}`,
                            )
                          }
                          title="View Detailed Sessions"
                        >
                          <FaEye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {attendance.length > 0 && (
          <div className="card-footer bg-light py-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
              <div className="text-muted small mb-2 mb-md-0">
                <strong>Note:</strong> Attendance below 75% may affect exam
                eligibility. Contact department for attendance regularization.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= FOOTER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mt-3 mt-md-4 animate-fade-in-up">
        <div className="card-body p-3 p-md-4 bg-light">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-center text-md-start">
              <p className="mb-1">
                <small className="text-muted">
                  <FaCalendarAlt className="me-1" />
                  Student Attendance Dashboard | Smart College ERP System
                </small>
              </p>
              <p className="mb-0">
                <small className="text-muted">
                  <FaSync className="spin-icon me-1" />
                  Attendance data last updated:{" "}
                  <strong>{new Date().toLocaleString()}</strong>
                </small>
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                onClick={fetchAttendance}
              >
                <FaSync size={12} /> Refresh
              </button>
              <button
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                onClick={() => navigate("/student/dashboard")}
              >
                <FaArrowLeft size={12} /> Dashboard
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
        .hover-lift:hover { animation: lift 0.3s ease forwards; }
        .spin-icon { animation: spin 1s linear infinite; }
        .float-badge { animation: float 3s ease-in-out infinite; }

        .bg-gradient-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }

        .attendance-logo-container {
          width: 60px;
          height: 60px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        .profile-avatar-container {
          position: relative;
          width: 80px;
          height: 80px;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
          font-size: 2rem;
        }

        .overall-percentage-circle {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: conic-gradient(
            ${overallStats.overallPercentage >= 75 ? "#28a745" : overallStats.overallPercentage >= 60 ? "#ffc107" : "#dc3545"} ${overallStats.overallPercentage}%,
            #e9ecef ${overallStats.overallPercentage}%
          );
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          position: relative;
        }

        .overall-percentage-circle::before {
          content: '';
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .percentage-text {
          position: relative;
          font-size: 2.5rem;
          font-weight: 800;
          color: ${overallStats.overallPercentage >= 75 ? "#28a745" : overallStats.overallPercentage >= 60 ? "#ffc107" : "#dc3545"};
          z-index: 2;
        }

        .progress-text {
          position: absolute;
          width: 100%;
          text-align: center;
          color: white;
          font-weight: 600;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        .table-danger {
          background-color: rgba(220, 53, 69, 0.08) !important;
        }
        .table-warning {
          background-color: rgba(255, 193, 7, 0.08) !important;
        }

        @media (max-width: 992px) {
          .attendance-logo-container {
            width: 50px;
            height: 50px;
          }
          .profile-avatar {
            width: 70px;
            height: 70px;
            font-size: 1.75rem;
          }
          .overall-percentage-circle {
            width: 120px;
            height: 120px;
          }
          .percentage-text {
            font-size: 2rem;
          }
        }

        @media (max-width: 768px) {
          .btn-sm {
            padding: 0.25rem 0.5rem !important;
            font-size: 0.75rem !important;
          }
          table thead th:nth-child(n+7),
          table tbody td:nth-child(n+7) {
            display: none;
          }
        }

        @media (max-width: 576px) {
          .attendance-logo-container {
            width: 45px;
            height: 45px;
          }
          .profile-avatar {
            width: 60px;
            height: 60px;
            font-size: 1.5rem;
          }
          .overall-percentage-circle {
            width: 100px;
            height: 100px;
          }
          .percentage-text {
            font-size: 1.75rem;
          }
          table thead th:nth-child(n+6),
          table tbody td:nth-child(n+6) {
            display: none;
          }
          .card-footer .d-flex {
            flex-direction: column;
            align-items: stretch;
          }
          .card-footer .d-flex > div {
            margin-bottom: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}