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
  FaTimesCircle
} from "react-icons/fa";

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT")
    return <Navigate to="/" />;

  /* ================= STATIC DATA (FOR NOW) ================= */
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
    "Mid-term exams start from 5th Feb",
    "Fee payment last date: 10th Feb",
    "New assignment uploaded in Data Structures"
  ];

  const timetable = [
    { day: "MON", subject: "Data Structures", time: "10:00 - 11:00" },
    { day: "TUE", subject: "Operating System", time: "11:00 - 12:00" },
    { day: "THU", subject: "Computer Networks", time: "09:00 - 10:00" }
  ];

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaUserGraduate className="me-2 blink" />
          Student Dashboard
        </h3>
        <p className="opacity-75 mb-0">
          Welcome back, {student.fullName}
        </p>
      </div>

      {/* ================= PROFILE ================= */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card shadow-lg border-0 rounded-4 glass-card h-100">
            <div className="card-body text-center">
              <FaUserGraduate size={70} className="text-primary mb-3" />
              <h5 className="fw-bold">{student.fullName}</h5>
              <p className="text-muted">{student.email}</p>
              <span className="badge bg-success px-3 py-2">
                {student.status}
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card shadow-lg border-0 rounded-4 glass-card h-100">
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

      {/* ================= STATS ================= */}
      <div className="row mb-4">

        {/* Attendance */}
        <div className="col-md-4">
          <StatCard
            icon={<FaCalendarAlt size={40} />}
            title="Attendance"
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
            content={
              <>
                <p>Total: ₹{fees.total}</p>
                <p className="text-success">Paid: ₹{fees.paid}</p>
                <p className="text-danger">Pending: ₹{fees.pending}</p>

                {fees.pending === 0 ? (
                  <span className="badge bg-success">
                    <FaCheckCircle className="me-1" />
                    Fully Paid
                  </span>
                ) : (
                  <span className="badge bg-danger">
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

      {/* ================= NOTIFICATIONS ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body">
          <h5 className="fw-bold mb-3">
            <FaBell className="me-2 text-warning" />
            Notifications
          </h5>

          <ul className="list-group">
            {notifications.map((n, i) => (
              <li key={i} className="list-group-item">
                {n}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(8px);
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

/* ================= SMALL COMPONENTS ================= */

function Info({ label, value }) {
  return (
    <div className="col-md-6 mb-2">
      <strong>{label}:</strong>
      <br />
      {value}
    </div>
  );
}

function StatCard({ icon, title, content }) {
  return (
    <div className="card shadow-lg border-0 rounded-4 glass-card h-100 mb-3">
      <div className="card-body text-center">
        <div className="text-info mb-2">
          {icon}
        </div>
        <h6 className="fw-bold">{title}</h6>
        {content}
      </div>
    </div>
  );
}
