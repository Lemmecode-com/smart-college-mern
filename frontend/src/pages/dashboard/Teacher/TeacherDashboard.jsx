import { Link } from "react-router-dom";
import {
  FaQrcode,
  FaUsers,
  FaChartBar,
  FaCalendarAlt,
  FaEdit,
  FaLock
} from "react-icons/fa";

export default function TeacherDashboard() {
  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          👨‍🏫 Teacher Dashboard
        </h3>
        <p className="opacity-75 mb-0">
          Manage your classes and attendance sessions
        </p>
      </div>

      {/* ================= ACTION CARDS ================= */}
      <div className="row g-4">

        {/* Create Session */}
        <div className="col-md-4">
          <div className="dashboard-card shadow-lg">
            <FaQrcode size={40} className="text-primary mb-3" />
            <h5>Create Session</h5>
            <p className="text-muted small">
              Open a new lecture for attendance
            </p>
            <Link to="/sessions/create" className="btn btn-primary w-100">
              Create
            </Link>
          </div>
        </div>

        {/* Mark Attendance */}
        <div className="col-md-4">
          <div className="dashboard-card shadow-lg">
            <FaUsers size={40} className="text-success mb-3" />
            <h5>Mark Attendance</h5>
            <p className="text-muted small">
              Mark students present / absent
            </p>
            <Link to="/attendance/mark" className="btn btn-success w-100">
              Mark
            </Link>
          </div>
        </div>

        {/* Attendance Report */}
        <div className="col-md-4">
          <div className="dashboard-card shadow-lg">
            <FaChartBar size={40} className="text-warning mb-3" />
            <h5>Attendance Report</h5>
            <p className="text-muted small">
              View your attendance analytics
            </p>
            <Link to="/attendance/report" className="btn btn-warning w-100">
              View
            </Link>
          </div>
        </div>

        {/* Edit Attendance */}
        <div className="col-md-4">
          <div className="dashboard-card shadow-lg">
            <FaEdit size={40} className="text-info mb-3" />
            <h5>Edit Attendance</h5>
            <p className="text-muted small">
              Modify open attendance sessions
            </p>
            <Link to="/attendance/mark" className="btn btn-info w-100">
              Edit
            </Link>
          </div>
        </div>

        {/* Close Session */}
        <div className="col-md-4">
          <div className="dashboard-card shadow-lg">
            <FaLock size={40} className="text-danger mb-3" />
            <h5>Close Session</h5>
            <p className="text-muted small">
              Finalize and lock attendance
            </p>
            <Link to="/attendance/mark" className="btn btn-danger w-100">
              Close
            </Link>
          </div>
        </div>

        {/* Timetable */}
        <div className="col-md-4">
          <div className="dashboard-card shadow-lg">
            <FaCalendarAlt size={40} className="text-secondary mb-3" />
            <h5>My Timetable</h5>
            <p className="text-muted small">
              View your teaching schedule
            </p>
            <Link to="/timetable/view" className="btn btn-secondary w-100">
              View
            </Link>
          </div>
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
          padding: 30px 20px;
          text-align: center;
          transition: 0.3s;
        }

        .dashboard-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        `}
      </style>
    </div>
  );
}
