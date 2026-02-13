import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaQrcode,
  FaUsers,
  FaChartBar,
  FaCalendarAlt,
  FaEdit,
  FaLock
} from "react-icons/fa";

export default function TeacherDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const res = await api.get("/dashboard/teacher");
      setData(res.data);
    };
    fetchDashboard();
  }, []);

  if (!data) return <p className="text-center mt-4">Loading...</p>;

  const { teacher, stats, recentLectures } = data;

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          👨‍🏫 Welcome, {teacher.name}
        </h3>
        <p className="opacity-75 mb-0">
          Employee ID: {teacher.employeeId}
        </p>
      </div>

      {/* ================= STATS SECTION ================= */}
      <div className="row g-4 mb-4">

        <StatCard title="Total Lectures" value={stats.totalLecturesTaken} />
        <StatCard title="Open Sessions" value={stats.openSessions} />
        <StatCard title="Closed Sessions" value={stats.closedSessions} />
        <StatCard title="Attendance %" value={`${stats.attendancePercentage}%`} />
        {/* <StatCard title="Total Present" value={stats.totalPresent} />
        <StatCard title="Total Absent" value={stats.totalAbsent} /> */}

      </div>

      {/* ================= ACTION CARDS ================= */}
      <div className="row g-4 mb-5">

        <ActionCard
          icon={<FaQrcode size={40} className="text-primary mb-3" />}
          title="Create Session"
          desc="Open a new lecture for attendance"
          link="/timetable/weekly-timetable"
          btn="btn-primary"
        />

        <ActionCard
          icon={<FaUsers size={40} className="text-success mb-3" />}
          title="Mark Attendance"
          desc="Mark students present / absent"
          link="/attendance/my-sessions-list"
          btn="btn-success"
        />

        <ActionCard
          icon={<FaChartBar size={40} className="text-warning mb-3" />}
          title="Attendance Report"
          desc="View your attendance analytics"
          link="/attendance/report"
          btn="btn-warning"
        />

      </div>

      {/* ================= RECENT LECTURES ================= */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="fw-bold mb-3">Recent Lectures</h5>

          <table className="table table-bordered">
            <thead className="table-dark">
              <tr>
                <th>Date</th>
                <th>Course</th>
                <th>Subject</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLectures.map((lec) => (
                <tr key={lec._id}>
                  <td>{new Date(lec.lectureDate).toLocaleDateString()}</td>
                  <td>{lec.course_id?.name}</td>
                  <td>{lec.subject_id?.name}</td>
                  <td>
                    <span className={`badge ${
                      lec.status === "OPEN"
                        ? "bg-success"
                        : "bg-secondary"
                    }`}>
                      {lec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .dashboard-card {
          background: white;
          border-radius: 16px;
          padding: 25px;
          text-align: center;
          transition: 0.3s;
        }

        .dashboard-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        `}
      </style>
    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function StatCard({ title, value }) {
  return (
    <div className="col-md-3">
      <div className="dashboard-card shadow">
        <h6>{title}</h6>
        <h3>{value}</h3>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, desc, link, btn }) {
  return (
    <div className="col-md-4">
      <div className="dashboard-card shadow-lg">
        {icon}
        <h5>{title}</h5>
        <p className="text-muted small">{desc}</p>
        <Link to={link} className={`btn ${btn} w-100`}>
          Open
        </Link>
      </div>
    </div>
  );
}
