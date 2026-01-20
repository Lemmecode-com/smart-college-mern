import { useContext, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUniversity,
  FaLayerGroup,
  FaUserGraduate,
  FaClipboardList,
  FaArrowRight
} from "react-icons/fa";

import Spinner from "react-bootstrap/Spinner";

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= HARD SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role === "SUPER_ADMIN")
    return <Navigate to="/super-admin/dashboard" />;

  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH COLLEGE STATS ================= */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/college/stats");
        setStats(res.data);
      } catch {
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
      <h3 className="fw-bold mb-4">College Admin Dashboard</h3>

      {!stats && (
        <p className="text-danger">
          Unable to load college statistics.
        </p>
      )}

      {stats && (
        <>
          <div className="row g-4 mb-4">
            <StatCard
              icon={<FaUniversity />}
              title="Departments"
              value={stats.departments}
              link="/departments"
            />
            <StatCard
              icon={<FaLayerGroup />}
              title="Courses"
              value={stats.courses}
              link="/courses"
            />
            <StatCard
              icon={<FaUserGraduate />}
              title="Students"
              value={stats.students}
              link="/students"
            />
            <StatCard
              icon={<FaClipboardList />}
              title="Attendance"
              value={stats.attendance}
              link="/attendance/report"
            />
          </div>

          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Quick Actions</h5>
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
    <div className="col-md-4 col-sm-6">
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
