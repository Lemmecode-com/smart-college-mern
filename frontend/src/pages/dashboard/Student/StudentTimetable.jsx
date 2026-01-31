import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";

import {
  FaCalendarAlt,
  FaClock,
  FaBook,
  FaDoorOpen,
  FaUserGraduate
} from "react-icons/fa";

export default function StudentTimetable() {
  const { user } = useContext(AuthContext);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= STATIC TIMETABLE DATA ================= */
  const [timetable] = useState([
    { _id: "1", dayOfWeek: "MON", subject: "Ancient History", startTime: "10:00", endTime: "11:00", room: "A-101", teacher: "Dr. Sharma" },
    { _id: "2", dayOfWeek: "TUE", subject: "Political Science", startTime: "11:00", endTime: "12:00", room: "B-202", teacher: "Prof. Patil" },
    { _id: "3", dayOfWeek: "WED", subject: "Sociology", startTime: "09:00", endTime: "10:00", room: "C-303", teacher: "Dr. Kulkarni" },
    { _id: "4", dayOfWeek: "THU", subject: "Geography", startTime: "10:30", endTime: "11:30", room: "A-104", teacher: "Prof. Deshmukh" },
    { _id: "5", dayOfWeek: "FRI", subject: "Economics", startTime: "12:00", endTime: "13:00", room: "D-201", teacher: "Dr. Joshi" }
  ]);

  const days = ["MON", "TUE", "WED", "THU", "FRI"];

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaCalendarAlt className="me-2 blink" />
          My Timetable
        </h3>
        <p className="opacity-75 mb-0">Weekly class calendar</p>
      </div>

      {/* ================= CALENDAR GRID ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">

          <div className="row g-3">

            {days.map((day) => (
              <div key={day} className="col-lg col-md-6">
                <div className="day-column">
                  <h6 className="day-header">{day}</h6>

                  {timetable
                    .filter((t) => t.dayOfWeek === day)
                    .map((t) => (
                      <div key={t._id} className="class-card">
                        <h6 className="fw-bold mb-1">
                          <FaBook className="me-2 text-success" />
                          {t.subject}
                        </h6>

                        <p className="mb-1 small">
                          <FaClock className="me-1 text-primary" />
                          {t.startTime} - {t.endTime}
                        </p>

                        <p className="mb-1 small">
                          <FaDoorOpen className="me-1 text-warning" />
                          {t.room}
                        </p>

                        <p className="mb-0 small">
                          <FaUserGraduate className="me-1 text-danger" />
                          {t.teacher}
                        </p>
                      </div>
                    ))}

                  {timetable.filter((t) => t.dayOfWeek === day).length === 0 && (
                    <div className="text-muted small text-center mt-3">
                      No Classes
                    </div>
                  )}
                </div>
              </div>
            ))}

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

        .day-column {
          background: #f9fbfc;
          border-radius: 12px;
          padding: 12px;
          min-height: 280px;
          box-shadow: inset 0 0 0 1px #e0e6eb;
        }

        .day-header {
          text-align: center;
          font-weight: 700;
          color: #0f3a4a;
          margin-bottom: 10px;
        }

        .class-card {
          background: white;
          border-radius: 10px;
          padding: 10px;
          margin-bottom: 10px;
          box-shadow: 0 3px 8px rgba(0,0,0,0.08);
          transition: transform 0.2s ease;
        }

        .class-card:hover {
          transform: translateY(-3px);
        }
        `}
      </style>
    </div>
  );
}
