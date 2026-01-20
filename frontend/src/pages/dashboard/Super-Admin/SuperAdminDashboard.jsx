import { useContext, useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUniversity,
  FaUsers,
  FaToggleOn,
  FaChartBar,
  FaArrowRight
} from "react-icons/fa";

import Spinner from "react-bootstrap/Spinner";

export default function SuperAdminDashboard() {
  const { user } = useContext(AuthContext);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= HARD SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "SUPER_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH SYSTEM STATS ================= */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/master/stats");
        setStats(res.data);
      } catch (err) {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="fw-bold mb-2">Super Admin Dashboard</h3>
      <p className="text-muted mb-4">
        System-wide overview of all colleges
      </p>

      {!stats && (
        <p className="text-danger">
          Unable to load system statistics.
        </p>
      )}

      {stats && (
        <>
          {/* ================= STAT CARDS ================= */}
          <div className="row g-4 mb-4">
            <StatCard
              icon={<FaUniversity />}
              title="Total Colleges"
              value={stats.totalColleges}
              link="/super-admin/colleges"
            />
            <StatCard
              icon={<FaUsers />}
              title="Total Users"
              value={stats.totalUsers}
              link="/super-admin/users"
            />
            <StatCard
              icon={<FaToggleOn />}
              title="Active Colleges"
              value={stats.activeColleges}
              link="/super-admin/colleges"
            />
            <StatCard
              icon={<FaChartBar />}
              title="Platform Usage"
              value={`${stats.usage}%`}
              link="/super-admin/analytics"
            />
          </div>

          {/* ================= QUICK ACTIONS ================= */}
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Quick Actions</h5>
              <div className="row g-3">
                <QuickLink
                  to="/super-admin/colleges"
                  label="Manage Colleges"
                />
                <QuickLink
                  to="/super-admin/create-college"
                  label="Add New College"
                />
                <QuickLink
                  to="/super-admin/settings"
                  label="System Settings"
                />
                <QuickLink
                  to="/super-admin/analytics"
                  label="View Analytics"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================= STAT CARD ================= */
function StatCard({ icon, title, value, link }) {
  return (
    <div className="col-md-3 col-sm-6">
      <Link to={link} className="text-decoration-none">
        <div
          className="card h-100 border-0 shadow-sm text-white"
          style={{
            background: "linear-gradient(180deg, #3a0f4a, #5a1352)",
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
    <div className="col-md-4 col-sm-6">
      <Link
        to={to}
        className="btn w-100 text-white rounded-pill"
        style={{
          background: "linear-gradient(180deg, #3a0f4a, #5a1352)",
        }}
      >
        {label}
      </Link>
    </div>
  );
}
