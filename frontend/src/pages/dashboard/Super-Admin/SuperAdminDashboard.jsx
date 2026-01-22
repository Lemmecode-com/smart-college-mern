import { useContext, useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";

import {
  FaUniversity,
  FaUsers,
  FaToggleOn,
  FaChartBar,
  FaArrowRight,
  FaPlusCircle,
  FaCog
} from "react-icons/fa";

export default function SuperAdminDashboard() {
  const { user } = useContext(AuthContext);

  const [stats, setStats] = useState({
    totalColleges: 12,
    totalUsers: 1240,
    activeColleges: 9,
    usage: 78
  });

  const [animatedStats, setAnimatedStats] = useState({
    totalColleges: 0,
    totalUsers: 0,
    activeColleges: 0,
    usage: 0
  });

  /* ================= HARD SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "SUPER_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= COUNT-UP ANIMATION ================= */
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedStats((prev) => ({
        totalColleges:
          prev.totalColleges < stats.totalColleges
            ? prev.totalColleges + 1
            : stats.totalColleges,

        totalUsers:
          prev.totalUsers < stats.totalUsers
            ? prev.totalUsers + 20
            : stats.totalUsers,

        activeColleges:
          prev.activeColleges < stats.activeColleges
            ? prev.activeColleges + 1
            : stats.activeColleges,

        usage:
          prev.usage < stats.usage
            ? prev.usage + 1
            : stats.usage,
      }));
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container-fluid">

      <h3 className="fw-bold mb-1">Super Admin Dashboard</h3>
      <p className="text-muted mb-4">
        System-wide overview of Smart College ERP
      </p>

      {/* ================= STAT CARDS ================= */}
      <div className="row g-4 mb-4">
        <StatCard
          icon={<FaUniversity />}
          title="Total Colleges"
          value={animatedStats.totalColleges}
          link="/super-admin/colleges"
          color="linear-gradient(135deg,#667eea,#764ba2)"
        />

        <StatCard
          icon={<FaUsers />}
          title="Total Users"
          value={animatedStats.totalUsers}
          link="/super-admin/users"
          color="linear-gradient(135deg,#43cea2,#185a9d)"
        />

        <StatCard
          icon={<FaToggleOn />}
          title="Active Colleges"
          value={animatedStats.activeColleges}
          link="/super-admin/colleges"
          color="linear-gradient(135deg,#f7971e,#ffd200)"
        />

        <StatCard
          icon={<FaChartBar />}
          title="Platform Usage"
          value={`${animatedStats.usage}%`}
          link="/super-admin/analytics"
          color="linear-gradient(135deg,#ff512f,#dd2476)"
        />
      </div>

      {/* ================= QUICK ACTIONS ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body">
          <h5 className="fw-semibold mb-3">Quick Actions</h5>

          <div className="row g-3">
            <QuickLink
              to="/super-admin/create-college"
              label="Add New College"
              icon={<FaPlusCircle />}
            />

            <QuickLink
              to="/super-admin/colleges"
              label="Colleges-List"
              icon={<FaUniversity />}
            />

            <QuickLink
              to="/super-admin/settings"
              label="System Settings"
              icon={<FaCog />}
            />
          </div>
        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>
        {`
        .stat-card {
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-8px) scale(1.03);
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }

        .glass-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
        }
        `}
      </style>
    </div>
  );
}

/* ================= STAT CARD ================= */
function StatCard({ icon, title, value, link, color }) {
  return (
    <div className="col-md-3 col-sm-6">
      <Link to={link} className="text-decoration-none">
        <div
          className="card h-100 border-0 text-white stat-card"
          style={{ background: color }}
        >
          <div className="card-body text-center">
            <div className="fs-2 mb-2 blink">{icon}</div>
            <h6 className="opacity-75">{title}</h6>
            <h2 className="fw-bold">{value}</h2>
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
function QuickLink({ to, label, icon }) {
  return (
    <div className="col-md-4 col-sm-6">
      <Link
        to={to}
        className="btn w-100 text-white rounded-pill d-flex align-items-center justify-content-center gap-2"
        style={{
          background: "linear-gradient(135deg,#1f4037,#99f2c8)",
          height: "50px"
        }}
      >
        {icon}
        {label}
      </Link>
    </div>
  );
}
