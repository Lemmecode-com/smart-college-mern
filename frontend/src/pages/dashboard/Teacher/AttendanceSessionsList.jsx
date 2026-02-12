import { useEffect, useState } from "react";
import api from "../../../api/axios";
import CreateSessionModal from "./CreateSessionModal";
import { useNavigate } from "react-router-dom";

export default function AttendanceSessionsList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  const fetchSessions = async () => {
    try {
      const res = await api.get("/attendance/sessions");
      setSessions(res.data);
    } catch {
      alert("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) return <p>Loading sessions...</p>;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between mb-3">
        <h4>Attendance Sessions</h4>
        {/* <button
          className="btn btn-success"
          onClick={() => setShowModal(true)}
        >
          + Create Session
        </button> */}
      </div>

      <table className="table table-bordered">
        <thead className="table-dark">
          <tr>
            <th>Date</th>
            <th>Lecture No.</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Students</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {sessions.map((s) => (
            <tr key={s._id}>
              <td>{new Date(s.lectureDate).toLocaleDateString()}</td>
              <td>{s.lectureNumber}</td>
              <td>{s.subject_id?.name}</td>
              <td>
                <span className={`badge ${
                  s.status === "OPEN"
                    ? "bg-success"
                    : "bg-secondary"
                }`}>
                  {s.status}
                </span>
              </td>
              <td>{s.totalStudents}</td>
              <td>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() =>
                    navigate(`/attendance/session/${s._id}`)
                  }
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <CreateSessionModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchSessions}
        />
      )}
    </div>
  );
}
