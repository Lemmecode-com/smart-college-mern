import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import {
  FaBell,
  FaUserTie,
  FaChalkboardTeacher,
  FaClock,
  FaSpinner,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function StudentNotificationList() {
  const navigate = useNavigate();
  const [adminNotes, setAdminNotes] = useState([]);
  const [teacherNotes, setTeacherNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  /* ================= FETCH ================= */
  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/notifications/student/read");
      setAdminNotes(res.data.adminNotifications || []);
      setTeacherNotes(res.data.teacherNotifications || []);

      // Show success toast if notifications exist
      const totalNotes =
        (res.data.adminNotifications?.length || 0) +
        (res.data.teacherNotifications?.length || 0);
      if (totalNotes > 0) {
        toast.success(`Loaded ${totalNotes} notifications`, {
          position: "top-right",
          autoClose: 3000,
          icon: <FaBell />,
        });
      }
    } catch (err) {
      const statusCode = err.response?.status;
      const errorMsg =
        err.response?.data?.message ||
        "Failed to load notifications. Please check your connection.";
      setError({ message: errorMsg, statusCode });
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // Handle retry action
  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    await fetchNotes();
    setIsRetrying(false);
  };

  // Handle go back action
  const handleGoBack = () => {
    navigate("/student/dashboard");
  };

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading Notifications..." />;
  }

  if (error) {
    return (
      <ApiError
        title="Error Loading Notifications"
        message={
          error.message || "Failed to load notifications. Please try again."
        }
        statusCode={error.statusCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={isRetrying}
      />
    );
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
                <span className="badge bg-primary mb-2">{note.type}</span>

                <h6 className="fw-bold">{note.title}</h6>
                <p className="text-muted small">{note.message}</p>

                <small className="text-muted d-flex align-items-center gap-1">
                  <FaClock />
                  {new Date(note.createdAt).toLocaleString()}
                </small>

                {note.expiresAt && (
                  <small className="text-danger d-block mt-2">
                    Expires on: {new Date(note.expiresAt).toDateString()}
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
