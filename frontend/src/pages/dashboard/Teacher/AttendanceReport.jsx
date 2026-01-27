import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaChartBar,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaBookOpen,
  FaUniversity
} from "react-icons/fa";

export default function AttendanceReport() {
  const { user } = useContext(AuthContext);

  const [reportData, setReportData] = useState([]);
  const [totalLectures, setTotalLectures] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH REPORT ================= */
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get("/attendance/teacher/report");

        // 🔥 EXACT BACKEND SHAPE
        setReportData(res.data.report || []);
        setTotalLectures(res.data.totalLectures || 0);

      } catch (err) {
        console.error(err);
        setError("Failed to load attendance report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  /* ================= ANALYTICS ================= */
  const totalStudents = reportData.reduce(
    (sum, r) => sum + (r.totalStudents || 0),
    0
  );

  const totalPresent = reportData.reduce(
    (sum, r) => sum + (r.present || 0),
    0
  );

  const totalAbsent = reportData.reduce(
    (sum, r) => sum + (r.absent || 0),
    0
  );

  const overallPercentage =
    totalStudents > 0
      ? Math.round((totalPresent / totalStudents) * 100)
      : 0;

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Attendance Report...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaChartBar className="me-2 blink" />
          Teacher Attendance Report
        </h3>
        <p className="opacity-75 mb-0">
          Complete lecture-wise attendance analytics
        </p>
      </div>

      {error && (
        <div className="alert alert-danger text-center">
          {error}
        </div>
      )}

      {/* ================= STATS CARDS ================= */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="stat-card shadow-sm">
            <h6>Total Lectures</h6>
            <h3>{totalLectures}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card shadow-sm">
            <h6>Total Students</h6>
            <h3>{totalStudents}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card shadow-sm text-success">
            <h6>Total Present</h6>
            <h3>{totalPresent}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card shadow-sm text-danger">
            <h6>Total Absent</h6>
            <h3>{totalAbsent}</h3>
          </div>
        </div>
      </div>

      {/* ================= OVERALL SUMMARY ================= */}
      <div className="card shadow-sm border-0 rounded-4 mb-4">
        <div className="card-body text-center">
          <h5 className="fw-bold mb-2">
            Overall Attendance Percentage
          </h5>
          <h2
            className={
              overallPercentage >= 75
                ? "text-success"
                : overallPercentage >= 40
                ? "text-warning"
                : "text-danger"
            }
          >
            {overallPercentage}%
          </h2>
        </div>
      </div>

      {/* ================= EMPTY ================= */}
      {reportData.length === 0 && !error && (
        <div className="alert alert-warning text-center">
          No attendance records found.
        </div>
      )}

      {/* ================= REPORT TABLE ================= */}
      {reportData.length > 0 && (
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body">

            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>
                    <FaCalendarAlt className="me-1" />
                    Date
                  </th>
                  <th>Lecture</th>
                  <th>
                    <FaBookOpen className="me-1" />
                    Subject
                  </th>
                  <th>Code</th>
                  <th>
                    <FaUniversity className="me-1" />
                    Course
                  </th>
                  <th>Department</th>
                  <th className="text-center">
                    <FaUsers className="me-1" />
                    Total
                  </th>
                  <th className="text-center text-success">
                    <FaCheckCircle className="me-1" />
                    Present
                  </th>
                  <th className="text-center text-danger">
                    <FaTimesCircle className="me-1" />
                    Absent
                  </th>
                  <th className="text-center">% </th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      {new Date(r.lectureDate).toLocaleDateString()}
                    </td>
                    <td>{r.lectureNumber}</td>
                    <td>{r.subject}</td>
                    <td>{r.subjectCode}</td>
                    <td>{r.course}</td>
                    <td>{r.department}</td>
                    <td className="text-center">
                      {r.totalStudents}
                    </td>
                    <td className="text-center text-success">
                      {r.present}
                    </td>
                    <td className="text-center text-danger">
                      {r.absent}
                    </td>
                    <td className="text-center fw-bold">
                      {r.attendancePercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(10px);
        }

        .stat-card {
          background: white;
          border-radius: 14px;
          padding: 20px;
          text-align: center;
        }

        .stat-card h6 {
          color: #6c757d;
          margin-bottom: 6px;
        }

        .stat-card h3 {
          font-weight: bold;
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }
        `}
      </style>
    </div>
  );
}
