// import { useContext, useEffect, useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { AuthContext } from "../../auth/AuthContext";
// import api from "../../api/axios";
// import { Card, Row, Col, Spinner, Alert } from "react-bootstrap";

// export default function Dashboard() {
//   const { user } = useContext(AuthContext);
//   const [stats, setStats] = useState(null);
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (user?.role === "admin") {
//       api.get("/admin/stats")
//         .then((res) => setStats(res.data.data))
//         .catch(() => setStats(null));
//     }
//   }, [user]);

//   if (user?.role !== "admin") return null;

//   return (
//     <div>
//       <h3 className="mb-4">Admin Dashboard</h3>

//       {!stats && <p>Loading dashboard...</p>}

//       {stats && (
//         <>
//           {/* ---------------- STATS CARDS ---------------- */}
//           <div className="row g-4 mb-4">
//             <StatCard
//               title="Departments"
//               value={stats.departments}
//               link="/departments"
//             />
//             <StatCard
//               title="Courses"
//               value={stats.courses}
//               link="/courses"
//             />
//             <StatCard
//               title="Students"
//               value={stats.students}
//               link="/students"
//             />
//             <StatCard
//               title="Attendance"
//               value={stats.attendance}
//               link="/attendance/list"
//             />
//           </div>

//           {/* ---------------- QUICK LINKS ---------------- */}
//           <div className="card shadow-sm">
//             <div className="card-body">
//               <h5 className="mb-3">Quick Actions</h5>

//               <div className="row g-3">
//                 <QuickLink to="/departments" label="Manage Departments" />
//                 <QuickLink to="/courses" label="Manage Courses" />
//                 <QuickLink to="/students" label="View Students" />
//                 <QuickLink to="/attendance/list" label="Attendance Records" />
//               </div>
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// /* ---------------- STAT CARD ---------------- */
// function StatCard({ title, value, link }) {
//   return (
//     <div className="col-md-3">
//       <Link to={link} className="text-decoration-none">
//         <div className="card shadow-sm h-100 text-center hover-card">
//           <div className="card-body">
//             <h6 className="text-muted">{title}</h6>
//             <h3 className="fw-bold">{value}</h3>
//             <small className="text-primary">View details →</small>
//           </div>
//         </div>
//       </Link>
//     </div>
//   );
// }

// /* ---------------- QUICK LINK BUTTON ---------------- */
// function QuickLink({ to, label }) {
//   return (
//     <div className="col-md-4">
//       <Link to={to} className="btn btn-outline-primary w-100">
//         {label}
//       </Link>
//     </div>
//   );
// }


import { useContext, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AuthContext } from "../../auth/AuthContext";
import api from "../../api/axios";
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

  /* ================= ADMIN DASHBOARD ================= */
  useEffect(() => {
    if (user?.role === "admin") {
      api
        .get("/admin/stats")
        .then((res) => setStats(res.data.data))
        .catch(() => setStats(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  /* ================= REDIRECT SAFETY ================= */
  if (!user) return <Navigate to="/login" />;

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  /* ================= ROLE BASED ================= */
  if (user.role === "teacher") return <TeacherDashboard />;
  if (user.role === "student") return <StudentDashboard />;
  if (user.role === "parent") return <ParentDashboard />;

  /* ================= ADMIN VIEW ================= */
  return (
    <div>
      <h3 className="fw-bold mb-4">Admin Dashboard</h3>

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
              link="/attendance/list"
            />
          </div>

          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Quick Actions</h5>
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

/* ================= STAT CARD ================= */
function StatCard({ icon, title, value, link }) {
  return (
    <div className="col-md-3 col-sm-6">
      <Link to={link} className="text-decoration-none">
        <div
          className="card h-100 border-0 shadow-sm text-white"
          style={{
            background: "linear-gradient(180deg, #0f3a4a, #134952)",
            transition: "transform .3s"
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

/* ================= TEACHER ================= */
function TeacherDashboard() {
  return (
    <div>
      <h4 className="fw-bold mb-3">Teacher Dashboard</h4>
      <p className="text-muted">
        Use the sidebar to mark attendance and view reports.
      </p>
    </div>
  );
}

/* ================= STUDENT ================= */
function StudentDashboard() {
  return (
    <div>
      <h4 className="fw-bold mb-3">Student Dashboard</h4>
      <p className="text-muted">
        View your attendance and academic records.
      </p>
    </div>
  );
}

/* ================= PARENT ================= */
function ParentDashboard() {
  return (
    <div>
      <h4 className="fw-bold mb-3">Parent Dashboard</h4>
      <p className="text-muted">
        Monitor your child’s attendance and progress.
      </p>
    </div>
  );
}
