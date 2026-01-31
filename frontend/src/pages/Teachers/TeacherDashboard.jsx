import { useContext } from "react";
import { Navigate, Link } from "react-router-dom";
import { AuthContext } from "../../auth/AuthContext";

import {
  FaBook,
  FaUsers,
  FaClipboardCheck,
  FaCalendarAlt,
  FaArrowRight,
  FaChalkboardTeacher
} from "react-icons/fa";

export default function TeacherDashboard() {
  const { user } = useContext(AuthContext);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/dashboard" />;

  /* ================= DUMMY STATS ================= */
  const stats = {
    subjects: 5,
    students: 120,
    sessions: 18,
    tasks: 3
  };

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header mb-4 p-4 rounded-4 text-white">
        <h3 className="fw-bold mb-1">
          <FaChalkboardTeacher className="blink me-2" />
          Teacher Dashboard
        </h3>
        <p className="opacity-75 mb-0">
          Welcome back, manage your academic activities
        </p>
      </div>

      {/* ================= STAT CARDS ================= */}
      <div className="row g-4 mb-4">
        <StatCard
          icon={<FaBook />}
          title="My Subjects"
          value={stats.subjects}
          link="/subjects"
        />
        <StatCard
          icon={<FaUsers />}
          title="My Students"
          value={stats.students}
          link="/students"
        />
        <StatCard
          icon={<FaClipboardCheck />}
          title="Attendance Sessions"
          value={stats.sessions}
          link="/attendance/report"
        />
        <StatCard
          icon={<FaCalendarAlt />}
          title="Pending Tasks"
          value={stats.tasks}
          link="/teacher/tasks"
        />
      </div>

      {/* ================= QUICK ACTIONS ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body">
          <h5 className="fw-semibold mb-3">
            Quick Actions
          </h5>

          <div className="row g-3">
            <QuickLink to="/attendance/mark" label="Mark Attendance" />
            <QuickLink to="/attendance/report" label="View Attendance" />
            <QuickLink to="/subjects" label="My Subjects" />
            <QuickLink to="/teacher/profile" label="My Profile" />
          </div>
        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(10px);
        }

        .stat-card {
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
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

/* ================= STAT CARD ================= */
function StatCard({ icon, title, value, link }) {
  return (
    <div className="col-md-3 col-sm-6">
      <Link to={link} className="text-decoration-none">
        <div
          className="card h-100 border-0 shadow-sm text-white stat-card"
          style={{
            background: "linear-gradient(180deg, #0f3a4a, #134952)"
          }}
        >
          <div className="card-body text-center">
            <div className="fs-2 mb-2 blink">{icon}</div>
            <h6 className="opacity-75">{title}</h6>
            <h3 className="fw-bold">{value}</h3>
            <small className="d-flex justify-content-center align-items-center gap-1">
              View details <FaArrowRight />
            </small>
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ================= QUICK LINK ================= */
function QuickLink({ to, label }) {
  return (
    <div className="col-md-3 col-sm-6">
      <Link
        to={to}
        className="btn w-100 text-white rounded-pill"
        style={{
          background: "linear-gradient(180deg, #0f3a4a, #134952)"
        }}
      >
        {label}
      </Link>
    </div>
  );
}
