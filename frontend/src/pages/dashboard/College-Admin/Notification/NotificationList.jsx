import { useEffect, useState } from "react";
import api from "../../../../api/axios";
import {
  FaBell,
  FaTrash,
  FaEdit,
  FaUserTie,
  FaUserGraduate,
  FaClock,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function NotificationList() {
  const [myNotes, setMyNotes] = useState([]);
  const [staffNotes, setStaffNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const fetchNotes = async () => {
    try {
      const res = await api.get("/notifications/admin/read");
      setMyNotes(res.data.myNotifications || []);
      setStaffNotes(res.data.staffNotifications || []);
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
    } catch (err) {
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
          <FaBell className="me-2" /> Notifications Center
        </h4>
        <p className="opacity-75 mb-0">
          Manage and view all announcements
        </p>
      </div>

      {/* MY NOTIFICATIONS */}
      <Section
        title="My Notifications"
        icon={<FaUserTie />}
        notes={myNotes}
        isOwner={true}
        onEdit={(id) => navigate(`/notification/edit/${id}`)}
        onDelete={deleteNote}
      />

      {/* STAFF NOTIFICATIONS */}
      <Section
        title="Teacher Notifications"
        icon={<FaUserGraduate />}
        notes={staffNotes}
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

/* ================= SECTION COMPONENT ================= */
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
