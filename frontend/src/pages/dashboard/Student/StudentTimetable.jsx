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
    {
      _id: "1",
      dayOfWeek: "MON",
      subject: "Ancient History",
      startTime: "10:00",
      endTime: "11:00",
      room: "A-101",
      teacher: "Dr. Sharma"
    },
    {
      _id: "2",
      dayOfWeek: "TUE",
      subject: "Political Science",
      startTime: "11:00",
      endTime: "12:00",
      room: "B-202",
      teacher: "Prof. Patil"
    },
    {
      _id: "3",
      dayOfWeek: "WED",
      subject: "Sociology",
      startTime: "09:00",
      endTime: "10:00",
      room: "C-303",
      teacher: "Dr. Kulkarni"
    },
    {
      _id: "4",
      dayOfWeek: "THU",
      subject: "Geography",
      startTime: "10:30",
      endTime: "11:30",
      room: "A-104",
      teacher: "Prof. Deshmukh"
    },
    {
      _id: "5",
      dayOfWeek: "FRI",
      subject: "Economics",
      startTime: "12:00",
      endTime: "13:00",
      room: "D-201",
      teacher: "Dr. Joshi"
    }
  ]);

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaCalendarAlt className="me-2 blink" />
          My Timetable
        </h3>
        <p className="opacity-75 mb-0">
          Weekly class schedule
        </p>
      </div>

      {/* ================= TIMETABLE TABLE ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">

          <table className="table table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>Day</th>
                <th>
                  <FaBook className="me-1" /> Subject
                </th>
                <th>
                  <FaClock className="me-1" /> Time
                </th>
                <th>
                  <FaDoorOpen className="me-1" /> Room
                </th>
                <th>
                  <FaUserGraduate className="me-1" /> Teacher
                </th>
              </tr>
            </thead>
            <tbody>
              {timetable.map((t) => (
                <tr key={t._id}>
                  <td>
                    <span className="badge bg-primary">
                      {t.dayOfWeek}
                    </span>
                  </td>
                  <td className="fw-semibold">{t.subject}</td>
                  <td>
                    {t.startTime} - {t.endTime}
                  </td>
                  <td>{t.room}</td>
                  <td>{t.teacher}</td>
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
        `}
      </style>
    </div>
  );
}
