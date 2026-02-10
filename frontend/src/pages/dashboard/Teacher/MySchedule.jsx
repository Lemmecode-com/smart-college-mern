import { useEffect, useState } from "react";
import api from "../../../api/axios";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const TIMES = [
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
];

export default function MySchedule() {
  const [weekly, setWeekly] = useState({});
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p className="text-center mt-4">Loading...</p>;

  return (
    <div className="container py-4">
      <h4 className="fw-bold mb-3">My Weekly Schedule</h4>

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-light">
            <tr>
              <th>Time</th>
              {DAYS.map(d => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {TIMES.map(time => (
              <tr key={time}>
                <td className="fw-semibold">{time}</td>

                {DAYS.map(day => {
                  const slot = weekly?.[day]?.find(
                    s => `${s.startTime} - ${s.endTime}` === time
                  );

                  return (
                    <td key={day}>
                      {slot ? (
                        <div className="p-2 border rounded bg-light">
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

                          <span className="badge bg-primary me-1">
                            {slot.slotType}
                          </span>

                          {slot.room && (
                            <span className="badge bg-secondary">
                              {slot.room}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
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
