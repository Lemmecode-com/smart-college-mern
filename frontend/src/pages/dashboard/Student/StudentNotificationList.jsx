import { useEffect, useState } from "react";
import api from "../../../api/axios";
import {
  FaBell,
  FaUserTie,
  FaChalkboardTeacher,
  FaClock
} from "react-icons/fa";

export default function StudentNotificationList() {
  const [adminNotes, setAdminNotes] = useState([]);
  const [teacherNotes, setTeacherNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= FETCH ================= */
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await api.get("/notifications/student/read");
        setAdminNotes(res.data.adminNotifications || []);
        setTeacherNotes(res.data.teacherNotifications || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <FaBell className="fs-2 text-muted" />
        <p className="text-muted mt-2">Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger text-center">{error}</div>;
  }

  return (
    <div className="container-fluid">
      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow mb-4">
        <h4 className="fw-bold mb-1">
          <FaBell className="me-2" /> Notifications
        </h4>
        <p className="opacity-75 mb-0">
          Important updates from college & teachers
        </p>
      </div>

      {/* ADMIN NOTIFICATIONS */}
      <Section
        title="From College Admin"
        icon={<FaUserTie />}
        notes={adminNotes}
      />

      {/* TEACHER NOTIFICATIONS */}
      <Section
        title="From Teachers"
        icon={<FaChalkboardTeacher />}
        notes={teacherNotes}
      />

      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }
        .note-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .note-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.12);
        }
      `}</style>
    </div>
  );
}

/* ================= SECTION ================= */
function Section({ title, icon, notes }) {
  return (
    <div className="mb-5">
      <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
        {icon} {title}
      </h5>

      {notes.length === 0 && (
        <div className="alert alert-secondary text-center">
          No notifications found
        </div>
      )}

      <div className="row g-4">
        {notes.map((note) => (
          <div className="col-lg-4 col-md-6" key={note._id}>
            <div className="card note-card shadow-sm border-0 rounded-4 h-100">
              <div className="card-body">
                <span className="badge bg-primary mb-2">
                  {note.type}
                </span>

                <h6 className="fw-bold">{note.title}</h6>
                <p className="text-muted small">
                  {note.message}
                </p>

                <small className="text-muted d-flex align-items-center gap-1">
                  <FaClock />
                  {new Date(note.createdAt).toLocaleString()}
                </small>

                {note.expiresAt && (
                  <small className="text-danger d-block mt-2">
                    Expires on:{" "}
                    {new Date(note.expiresAt).toDateString()}
                  </small>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
