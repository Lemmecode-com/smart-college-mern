import { useEffect, useState } from "react";
import api from "../../../api/axios";
import {
  FaBell,
  FaUserTie,
  FaChalkboardTeacher,
  FaClock,
  FaTrash,
  FaEdit
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const [myNotes, setMyNotes] = useState([]);
  const [adminNotes, setAdminNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const fetchNotes = async () => {
    try {
      const res = await api.get("/notifications/teacher/read");
      setMyNotes(res.data.myNotifications || []);
      setAdminNotes(res.data.adminNotifications || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const deleteNote = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await api.delete(`/notifications/delete-note/${id}`);
      fetchNotes();
    } catch {
      alert("Failed to delete notification");
    }
  };

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
          Your notices & admin announcements
        </p>
      </div>

      {/* MY NOTIFICATIONS */}
      <Section
        title="My Notifications"
        icon={<FaChalkboardTeacher />}
        notes={myNotes}
        isOwner
        onEdit={(id) => navigate(`/notifications/edit/${id}`)}
        onDelete={deleteNote}
      />

      {/* ADMIN NOTIFICATIONS */}
      <Section
        title="From College Admin"
        icon={<FaUserTie />}
        notes={adminNotes}
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
function Section({ title, icon, notes, isOwner, onEdit, onDelete }) {
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

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <small className="text-muted d-flex align-items-center gap-1">
                    <FaClock />
                    {new Date(note.createdAt).toLocaleString()}
                  </small>

                  {isOwner && (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onEdit(note._id)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onDelete(note._id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </div>

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
