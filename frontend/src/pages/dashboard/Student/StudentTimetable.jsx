import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";

import {
  FaCalendarAlt,
  FaClock,
  FaBook,
  FaDoorOpen,
  FaUserGraduate,
  FaLayerGroup,
  FaChalkboardTeacher
} from "react-icons/fa";

export default function StudentTimetable() {
  const { user } = useContext(AuthContext);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= WEEK & TIMES ================= */
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00",
    "01:00", "02:00", "03:00", "04:00"
  ];

  /* ================= STATIC DEMO DATA ================= */
  const [timetable] = useState([
    {
      _id: "1",
      date: "2026-02-02",
      day: "MON",
      subject: "Mathematics",
      course: "BCA",
      teacher: "Prof. Sharma",
      room: "A-101",
      startTime: "09:00",
      endTime: "10:00",
      lectureType: "THEORY"
    },
    {
      _id: "2",
      date: "2026-02-03",
      day: "TUE",
      subject: "Operating Systems",
      course: "BCA",
      teacher: "Dr. Patil",
      room: "Lab-2",
      startTime: "10:00",
      endTime: "11:00",
      lectureType: "PRACTICAL"
    },
    {
      _id: "3",
      date: "2026-02-04",
      day: "WED",
      subject: "DBMS",
      course: "BCA",
      teacher: "Prof. Kulkarni",
      room: "B-202",
      startTime: "11:00",
      endTime: "12:00",
      lectureType: "THEORY"
    },
    {
      _id: "4",
      date: "2026-02-05",
      day: "THU",
      subject: "Networking",
      course: "BCA",
      teacher: "Dr. Deshmukh",
      room: "C-301",
      startTime: "01:00",
      endTime: "02:00",
      lectureType: "THEORY"
    },
    {
      _id: "5",
      date: "2026-02-06",
      day: "FRI",
      subject: "Python Lab",
      course: "BCA",
      teacher: "Prof. Joshi",
      room: "Lab-1",
      startTime: "02:00",
      endTime: "03:00",
      lectureType: "PRACTICAL"
    }
  ]);

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaCalendarAlt className="me-2 blink" />
          Student Timetable
        </h3>
        <p className="opacity-75 mb-0">
          Date-wise & time-slot based academic calendar
        </p>
      </div>

      {/* ================= CALENDAR GRID ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4 timetable-grid">

          {/* Header Row */}
          <div className="grid-header">
            <div className="time-col"></div>
            {days.map((d) => (
              <div key={d} className="day-col-header">{d}</div>
            ))}
          </div>

          {/* Time Rows */}
          {timeSlots.map((time) => (
            <div className="grid-row" key={time}>
              <div className="time-col">
                <FaClock className="me-1" /> {time}
              </div>

              {days.map((day) => {
                const cls = timetable.find(
                  (t) => t.day === day && t.startTime === time
                );

                return (
                  <div key={day + time} className="cell">
                    {cls && (
                      <div className={`class-block ${cls.lectureType === "PRACTICAL" ? "practical" : "theory"}`}>
                        <strong>
                          <FaBook className="me-1" /> {cls.subject}
                        </strong>
                        <div className="small">
                          <FaLayerGroup className="me-1" /> {cls.course}
                        </div>
                        <div className="small">
                          <FaChalkboardTeacher className="me-1" /> {cls.teacher}
                        </div>
                        <div className="small">
                          <FaDoorOpen className="me-1" /> {cls.room}
                        </div>
                        <span className="badge bg-light text-dark mt-1">
                          {cls.lectureType}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.97);
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

        .timetable-grid {
          overflow-x: auto;
        }

        .grid-header, .grid-row {
          display: grid;
          grid-template-columns: 120px repeat(6, 1fr);
        }

        .day-col-header {
          text-align: center;
          font-weight: 700;
          padding: 8px;
          background: #0f3a4a;
          color: white;
        }

        .time-col {
          background: #f0f4f7;
          padding: 8px;
          font-weight: 600;
          text-align: center;
          border-right: 1px solid #ddd;
        }

        .cell {
          border: 1px solid #e0e0e0;
          min-height: 90px;
          padding: 4px;
          position: relative;
        }

        .class-block {
          border-radius: 8px;
          padding: 6px;
          color: white;
          font-size: 12px;
          height: 100%;
        }

        .class-block.theory {
          background: linear-gradient(180deg, #1e88e5, #1565c0);
        }

        .class-block.practical {
          background: linear-gradient(180deg, #43a047, #2e7d32);
        }
        `}
      </style>
    </div>
  );
}
