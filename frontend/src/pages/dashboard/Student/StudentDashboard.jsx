import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";

import {
  FaUserGraduate,
  FaUniversity,
  FaBook,
  FaCalendarAlt,
  FaMoneyCheckAlt,
  FaBell,
  FaCheckCircle,
  FaTimesCircle,
  FaChartLine
} from "react-icons/fa";

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ===== STATIC DATA ===== */
  const student = {
    fullName: "Sagar Kokare",
    email: "sagar@example.com",
    department: "Masters of Computer Application",
    course: "MCA",
    semester: 3,
    admissionYear: 2024,
    status: "APPROVED"
  };

  const attendance = {
    totalLectures: 42,
    present: 34,
    absent: 8,
    percentage: 81
  };

  const fees = {
    total: 55000,
    paid: 30000,
    pending: 25000
  };

  const notifications = [
    "📢 Mid-term exams start from 5th Feb",
    "💳 Fee payment last date: 10th Feb",
    "📘 New assignment uploaded in Data Structures"
  ];

  const timetable = [
    { day: "MON", subject: "Data Structures", time: "10:00 - 11:00" },
    { day: "TUE", subject: "Operating System", time: "11:00 - 12:00" },
    { day: "THU", subject: "Computer Networks", time: "09:00 - 10:00" }
  ];

  const attendanceProgress = (attendance.present / attendance.totalLectures) * 100;
  const feeProgress = (fees.paid / fees.total) * 100;

  return (
    <div className="container-fluid fade-in">

      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4 glow">
        <h3 className="fw-bold mb-1">
          <FaUserGraduate className="me-2 blink" />
          Student Dashboard
        </h3>
        <p className="opacity-75 mb-0">
          Welcome back, {student.fullName}
        </p>
      </div>

      {/* PROFILE + ACADEMIC */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card glass-card shadow-lg rounded-4 text-center slide-up">
            <div className="card-body">
              <FaUserGraduate size={70} className="text-primary mb-3 pulse" />
              <h5 className="fw-bold">{student.fullName}</h5>
              <p className="text-muted">{student.email}</p>
              <span className="badge bg-success px-3 py-2 blink">
                {student.status}
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card glass-card shadow-lg rounded-4 slide-up h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                <FaUniversity className="me-2" />
                Academic Information
              </h5>
              <div className="row">
                <Info label="Department" value={student.department} />
                <Info label="Course" value={student.course} />
                <Info label="Semester" value={student.semester} />
                <Info label="Admission Year" value={student.admissionYear} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI STATS */}
      <div className="row mb-4">

        {/* Attendance */}
        <div className="col-md-4">
          <StatCard
            icon={<FaCalendarAlt size={40} />}
            title="Attendance"
            progress={attendanceProgress}
            content={
              <>
                <p>Total: {attendance.totalLectures}</p>
                <p className="text-success">Present: {attendance.present}</p>
                <p className="text-danger">Absent: {attendance.absent}</p>
                <h4 className="fw-bold">{attendance.percentage}%</h4>
              </>
            }
          />
        </div>

        {/* Fees */}
        <div className="col-md-4">
          <StatCard
            icon={<FaMoneyCheckAlt size={40} />}
            title="Fees"
            progress={feeProgress}
            content={
              <>
                <p>Total: ₹{fees.total}</p>
                <p className="text-success">Paid: ₹{fees.paid}</p>
                <p className="text-danger">Pending: ₹{fees.pending}</p>

                {fees.pending === 0 ? (
                  <span className="badge bg-success blink">
                    <FaCheckCircle className="me-1" />
                    Fully Paid
                  </span>
                ) : (
                  <span className="badge bg-danger pulse">
                    <FaTimesCircle className="me-1" />
                    Payment Due
                  </span>
                )}
              </>
            }
          />
        </div>

        {/* Timetable */}
        <div className="col-md-4">
          <StatCard
            icon={<FaBook size={40} />}
            title="My Timetable"
            progress={65}
            content={
              <ul className="list-unstyled">
                {timetable.map((t, i) => (
                  <li key={i}>
                    <strong>{t.day}</strong> - {t.subject}
                    <br />
                    <small className="text-muted">{t.time}</small>
                  </li>
                ))}
              </ul>
            }
          />
        </div>

      </div>

      {/* NOTIFICATIONS */}
      <div className="card glass-card shadow-lg rounded-4 slide-up">
        <div className="card-body">
          <h5 className="fw-bold mb-3">
            <FaBell className="me-2 text-warning blink" />
            Notifications
          </h5>

          <ul className="list-group">
            {notifications.map((n, i) => (
              <li key={i} className="list-group-item pulse">
                {n}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CSS */}
      <style>{`
        .gradient-header {background: linear-gradient(180deg, #0f3a4a, #134952);}
        .glass-card {background: rgba(255,255,255,0.96); backdrop-filter: blur(10px);}
        .fade-in {animation: fade 1s;}
        .slide-up {animation: slideUp 0.6s;}
        .blink {animation: blink 1.5s infinite;}
        .pulse {animation: pulse 1.5s infinite;}
        .glow {box-shadow: 0 0 20px rgba(15,58,74,0.6);}
        .progress {height: 6px; border-radius: 10px;}
        @keyframes blink {50%{opacity:0.4}}
        @keyframes pulse {0%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes fade {from{opacity:0}to{opacity:1}}
        @keyframes slideUp {from{transform:translateY(20px)}to{transform:translateY(0)}}
      `}</style>
    </div>
  );
}

/* ===== REUSABLE ===== */

function Info({ label, value }) {
  return (
    <div className="col-md-6 mb-2">
      <strong>{label}:</strong>
      <br />
      {value}
    </div>
  );
}

function StatCard({ icon, title, content, progress }) {
  return (
    <div className="card glass-card shadow-lg rounded-4 h-100 mb-3 slide-up">
      <div className="card-body text-center">
        <div className="text-info mb-2">{icon}</div>
        <h6 className="fw-bold">{title}</h6>
        <div className="progress mb-2">
          <div
            className="progress-bar bg-success"
            style={{ width: `${progress}%` }}
          />
        </div>
        {content}
      </div>
    </div>
  );
}
