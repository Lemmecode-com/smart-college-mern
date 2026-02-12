import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

const TIMES = [
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 01:00",
  "01:00 - 02:00",
  "02:00 - 03:00",
  "03:00 - 04:00",
  "04:00 - 05:00",
];

export default function MySchedule() {
  const [weekly, setWeekly] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/timetable/weekly");
        setWeekly(res.data.weekly);
      } catch {
        alert("Failed to load schedule");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ================= CREATE ATTENDANCE ================= */
  const startAttendance = async (slot) => {
    if (!window.confirm("Start attendance for this lecture?")) return;

    try {
      setCreating(slot._id);

      const today = new Date().toISOString().split("T")[0];

      const res = await api.post("/attendance/sessions", {
        slot_id: slot._id,
        lectureDate: today,
        lectureNumber: 1, // you can auto-calc later
      });

      alert("Attendance session created");

      navigate(
        `/attendance/session/${res.data.session._id}`
      );
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to create attendance"
      );
    } finally {
      setCreating(null);
    }
  };

  if (loading)
    return <p className="text-center mt-4">Loading...</p>;

  return (
    <div className="container py-4">
      <h4 className="fw-bold mb-3">My Weekly Schedule</h4>

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-light">
            <tr>
              <th>Time</th>
              {DAYS.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {TIMES.map((time) => (
              <tr key={time}>
                <td className="fw-semibold">{time}</td>

                {DAYS.map((day) => {
                  const slot = weekly?.[day]?.find(
                    (s) =>
                      `${s.startTime} - ${s.endTime}` ===
                      time
                  );

                  return (
                    <td key={day}>
                      {slot ? (
                        <div className="p-2 border rounded bg-light shadow-sm">

                          <div className="fw-semibold">
                            {slot.subject_id?.name}
                          </div>

                          <small className="text-muted d-block">
                            {slot.timetable_id?.name}
                          </small>

                          <small className="text-muted d-block">
                            Sem {slot.timetable_id?.semester} ·{" "}
                            {slot.timetable_id?.academicYear}
                          </small>

                          <small className="d-block">
                            {slot.teacher_id?.name}
                          </small>

                          <div className="mt-1 mb-2">
                            <span className="badge bg-primary me-1">
                              {slot.slotType}
                            </span>

                            {slot.room && (
                              <span className="badge bg-secondary">
                                {slot.room}
                              </span>
                            )}
                          </div>

                          {/* 🔥 CONDITION: ONLY IF TIMETABLE IS PUBLISHED */}
                          {slot.timetable_id?.status ===
                          "PUBLISHED" ? (
                            <button
                              className="btn btn-success btn-sm w-100"
                              disabled={
                                creating === slot._id
                              }
                              onClick={() =>
                                startAttendance(slot)
                              }
                            >
                              {creating === slot._id
                                ? "Starting..."
                                : "Start Attendance"}
                            </button>
                          ) : (
                            <div className="text-danger small">
                              Timetable not published
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">
                          —
                        </span>
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
  );
}
