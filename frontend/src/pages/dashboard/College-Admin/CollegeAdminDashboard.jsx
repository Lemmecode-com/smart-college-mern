import { useContext } from "react";
import { Link, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";

import {
  FaUniversity,
  FaLayerGroup,
  FaUserGraduate,
  FaClipboardList,
  FaArrowRight,
  FaBolt
} from "react-icons/fa";

export default function CollegeAdminDashboard() {
  const { user } = useContext(AuthContext);

  /* ================= HARD SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role === "SUPER_ADMIN")
    return <Navigate to="/super-admin/dashboard" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/login" />;

  /* ================= MOCK STATS (NO API YET) ================= */
  const stats = {
    departments: 6,
    courses: 18,
    students: 420,
    attendance: "87%"
  };

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaBolt className="blink me-2" />
          College Admin Dashboard
        </h3>
        <p className="opacity-75 mb-0">
          Manage your college operations from one place
        </p>
      </div>

      {/* ================= STAT CARDS ================= */}
      <div className="row g-4 mb-4">
        <StatCard
          icon={<FaUniversity className="blink-slow" />}
          title="Departments"
          value={stats.departments}
          link="/departments"
        />
        <StatCard
          icon={<FaLayerGroup className="blink" />}
          title="Courses"
          value={stats.courses}
          link="/courses"
        />
        <StatCard
          icon={<FaUserGraduate className="blink-fast" />}
          title="Students"
          value={stats.students}
          link="/students"
        />
        <StatCard
          icon={<FaClipboardList className="blink-slow" />}
          title="Attendance"
          value={stats.attendance}
          link="/attendance/report"
        />
      </div>

      {/* ================= QUICK ACTIONS ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">
          <h5 className="fw-semibold mb-3">
            Quick Actions
          </h5>

          <div className="row g-3">
            <QuickLink to="/departments" label="Manage Departments" />
            <QuickLink to="/courses" label="Manage Courses" />
            <QuickLink to="/students" label="View Students" />
            <QuickLink
              to="/attendance/report"
              label="Attendance Records"
            />
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
          backdrop-filter: blur(8px);
        }

        .stat-card {
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 15px 30px rgba(0,0,0,0.2);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        .blink-slow {
          animation: blink 2.5s infinite;
        }

        .blink-fast {
          animation: blink 0.9s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }

        .pulse-btn {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
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
          className="card h-100 border-0 shadow-lg text-white stat-card"
          style={{
            background: "linear-gradient(180deg, #0f3a4a, #134952)"
          }}
        >
          <div className="card-body text-center">
            <div className="fs-2 mb-2">{icon}</div>
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
        className="btn w-100 text-white rounded-pill pulse-btn"
        style={{
          background: "linear-gradient(180deg, #0f3a4a, #134952)"
        }}
      >
        {label}
      </Link>
    </div>
  );
}
