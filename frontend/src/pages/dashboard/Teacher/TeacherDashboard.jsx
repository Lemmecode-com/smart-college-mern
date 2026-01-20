import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Link } from "react-router-dom";

export default function TeacherDashboard() {
  const [subjects, setSubjects] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api.get("/teachers/my-subjects").then((res) => setSubjects(res.data));

    api.get("/attendance/recent").then((res) => setRecent(res.data));
  }, []);

  return (
    <>
      <h3 className="mb-4">Teacher Dashboard</h3>

      <div className="row mb-4">
        {subjects.map((s) => (
          <div key={s._id} className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6>{s.name}</h6>
                <Link
                  to={`/attendance?subjectId=${s._id}`}
                  className="btn btn-sm btn-primary"
                >
                  Mark Attendance
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h5>Recent Attendance</h5>
      <ul className="list-group">
        {recent.map((r) => (
          <li key={r._id} className="list-group-item">
            {r.subject?.name} – {r.date}
          </li>
        ))}
      </ul>
    </>
  );
}
