import { useEffect, useState } from "react";
import api from "../../../api/axios";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

const TIME_SLOTS = [
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 01:00",
  "01:00 - 02:00",
  "02:00 - 03:00",
];

export default function StudentTimetable() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const res = await api.get("/timetable/student");
        setSlots(res.data);
      } catch (err) {
        alert("Failed to load timetable");
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, []);

  const getSlot = (day, timeRange) => {
    const [start] = timeRange.split(" - ");

    return slots.find((slot) => slot.day === day && slot.startTime === start);
  };

  const courseName = slots.length > 0 ? slots[0]?.course_id?.name : "";
  const semester = slots.length > 0 ? slots[0]?.timetable_id?.semester : "";
  const academicYear =
    slots.length > 0 ? slots[0]?.timetable_id?.academicYear : "";

  if (loading) return <p className="text-center mt-4">Loading...</p>;

  return (
    <div className="container py-4">
      {/* HEADER */}
      <div className="header p-4 rounded-4 text-white shadow mb-4">
        <h4 className="mb-1">📅 My Weekly Timetable</h4>

        {courseName && (
          <small className="d-block opacity-75">
            {courseName}
            {semester && ` • Sem ${semester}`}
            {academicYear && ` • ${academicYear}`}
          </small>
        )}
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered align-middle text-center mb-0">
              <thead className="table-dark">
                <tr>
                  <th style={{ width: "120px" }}>Time</th>
                  {DAYS.map((day) => (
                    <th key={day}>{day}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {TIME_SLOTS.map((time) => (
                  <tr key={time}>
                    <td className="fw-bold">{time}</td>

                    {DAYS.map((day) => {
                      const slot = getSlot(day, time);

                      return (
                        <td key={day}>
                          {!slot ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <div className="slot-card">
                              <h6 className="mb-1">{slot.subject_id?.name}</h6>

                              <small className="text-muted d-block">
                                {slot.subject_id?.code}
                              </small>

                              <small className="d-block">
                                {slot.teacher_id?.name}
                              </small>

                              <div className="mt-2">
                                <span className="badge bg-secondary me-1">
                                  Room {slot.room}
                                </span>

                                <span
                                  className={`badge ${
                                    slot.slotType === "LAB"
                                      ? "bg-danger"
                                      : slot.slotType === "PRACTICAL"
                                        ? "bg-warning"
                                        : "bg-primary"
                                  }`}
                                >
                                  {slot.slotType}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .header {
          background: linear-gradient(180deg,#0f3a4a,#134952);
        }

        .slot-card {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 8px;
          text-align: left;
          min-height: 95px;
          transition: 0.2s ease;
        }

        .slot-card:hover {
          background: #e9ecef;
        }

        th, td {
          vertical-align: middle !important;
        }
      `}</style>
    </div>
  );
}
