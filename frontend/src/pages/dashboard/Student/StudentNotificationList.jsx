import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../../api/axios";
import {
  FaBell,
  FaUserTie,
  FaChalkboardTeacher,
  FaClock,
  FaSpinner,
  FaExclamationTriangle
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
        setLoading(true);
        const res = await api.get("/notifications/student/read");
        setAdminNotes(res.data.adminNotifications || []);
        setTeacherNotes(res.data.teacherNotifications || []);
        
        // Show success toast if notifications exist
        const totalNotes = (res.data.adminNotifications?.length || 0) + (res.data.teacherNotifications?.length || 0);
        if (totalNotes > 0) {
          toast.success(`Loaded ${totalNotes} notifications`, {
            position: "top-right",
            autoClose: 3000,
            icon: <FaBell />
          });
        }
      } catch (err) {
        console.error(err);
        const errorMsg = "Failed to load notifications. Please check your connection.";
        setError(errorMsg);
        toast.error(errorMsg, {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  if (loading) {
    return (
      <div className="notifications-loading">
        <motion.div
          className="loading-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FaSpinner className="spin-icon" />
          <h3>Loading Notifications...</h3>
          <p>Fetching updates from college & teachers</p>
          <div className="loading-progress-bar">
            <div className="loading-progress"></div>
          </div>
        </motion.div>
        <style>{`
          .notifications-loading {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
          }
          .loading-content {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          }
          .spin-icon {
            font-size: 4rem;
            color: #1a4b6d;
            animation: spin 1s linear infinite;
            margin-bottom: 1.5rem;
          }
          .loading-content h3 {
            margin: 0 0 0.5rem 0;
            color: #1e293b;
            font-weight: 700;
          }
          .loading-content p {
            color: #64748b;
            margin: 0 0 1.5rem 0;
          }
          .loading-progress-bar {
            width: 200px;
            height: 4px;
            background: #e0e0e0;
            border-radius: 2px;
            margin: 0 auto;
            overflow: hidden;
          }
          .loading-progress {
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #1a4b6d, #2d6f8f);
            animation: loading 1.5s ease-in-out infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger text-center">{error}</div>;
  }

  return (
    <div className="container-fluid">
      <ToastContainer position="top-right" />
      
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
