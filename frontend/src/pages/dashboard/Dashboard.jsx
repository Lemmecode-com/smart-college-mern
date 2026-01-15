import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../auth/AuthContext";
import api from "../../api/axios";
import { Card, Row, Col, Spinner, Alert } from "react-bootstrap";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "admin") {
      api.get("/admin/stats")
        .then((res) => setStats(res.data.data))
        .catch(() => setStats(null));
    }
  }, [user]);

  if (user?.role !== "admin") return null;

  return (
    <div>
      <h3 className="mb-4">Admin Dashboard</h3>

      {!stats && <p>Loading dashboard...</p>}

      {stats && (
        <>
          {/* ---------------- STATS CARDS ---------------- */}
          <div className="row g-4 mb-4">
            <StatCard
              title="Departments"
              value={stats.departments}
              link="/departments"
            />
            <StatCard
              title="Courses"
              value={stats.courses}
              link="/courses"
            />
            <StatCard
              title="Students"
              value={stats.students}
              link="/students"
            />
            <StatCard
              title="Attendance"
              value={stats.attendance}
              link="/attendance/list"
            />
          </div>

          {/* ---------------- QUICK LINKS ---------------- */}
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">Quick Actions</h5>

              <div className="row g-3">
                <QuickLink to="/departments" label="Manage Departments" />
                <QuickLink to="/courses" label="Manage Courses" />
                <QuickLink to="/students" label="View Students" />
                <QuickLink to="/attendance/list" label="Attendance Records" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- STAT CARD ---------------- */
function StatCard({ title, value, link }) {
  return (
    <div className="col-md-3">
      <Link to={link} className="text-decoration-none">
        <div className="card shadow-sm h-100 text-center hover-card">
          <div className="card-body">
            <h6 className="text-muted">{title}</h6>
            <h3 className="fw-bold">{value}</h3>
            <small className="text-primary">View details →</small>
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ---------------- QUICK LINK BUTTON ---------------- */
function QuickLink({ to, label }) {
  return (
    <div className="col-md-4">
      <Link to={to} className="btn btn-outline-primary w-100">
        {label}
      </Link>
    </div>
  );
}
