import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaCalendarAlt,
  FaClock,
  FaChalkboardTeacher,
  FaBook,
  FaBuilding,
  FaLayerGroup,
  FaEdit,
  FaTrash,
  FaPlus
} from "react-icons/fa";

export default function ViewTimetable() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH ================= */
  const fetchTimetable = async () => {
    try {
      const res = await api.get("/timetable/admin");
      setTimetable(res.data?.timetable || []);
    } catch (error) {
      console.error("Timetable fetch failed:", error);
      setTimetable([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this timetable slot?"
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/timetable/${id}`);
      alert("Timetable slot deleted successfully");
      fetchTimetable();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading College Timetable...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <FaCalendarAlt className="me-2 blink" />
            College Timetable
          </h3>
          <p className="opacity-75 mb-0">
            Complete academic schedule for all departments
          </p>
        </div>

        <button
          className="btn btn-light fw-semibold mt-2 mt-md-0"
          onClick={() => navigate("/timetable/create")}
        >
          <FaPlus className="me-2" />
          Add Timetable
        </button>
      </div>

      {/* ================= GRID ================= */}
      {timetable.length === 0 ? (
        <div className="alert alert-info">
          No timetable slots created yet.
        </div>
      ) : (
        <div className="row g-4">
          {timetable.map((t) => (
            <div key={t._id} className="col-xl-3 col-lg-4 col-md-6">
              <div className="card shadow-lg border-0 rounded-4 glass-card h-100">
                <div className="card-body">

                  <div className="d-flex justify-content-between mb-2">
                    <span className="badge bg-primary">
                      {t.dayOfWeek}
                    </span>
                    <span
                      className={`badge ${
                        t.status === "ACTIVE"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <h6 className="fw-bold text-primary mb-2">
                    <FaClock className="me-2" />
                    {t.startTime} - {t.endTime}
                  </h6>

                  <p className="mb-1">
                    <FaBook className="me-2 text-success" />
                    {t.subject_id?.name} ({t.subject_id?.code})
                  </p>

                  <p className="mb-1">
                    <FaChalkboardTeacher className="me-2 text-warning" />
                    {t.teacher_id?.name}
                  </p>

                  <p className="mb-1">
                    <FaLayerGroup className="me-2" />
                    {t.course_id?.name}
                  </p>

                  <p className="mb-1">
                    <FaBuilding className="me-2" />
                    {t.department_id?.name}
                  </p>

                  <p className="mb-1">
                    Semester: <strong>{t.semester}</strong>
                  </p>

                  <p className="mb-1">
                    Year: <strong>{t.academicYear}</strong>
                  </p>

                  <p className="mb-1">
                    Type: <strong>{t.lectureType}</strong>
                  </p>

                  <p className="mb-2">
                    Room: <strong>{t.room}</strong>
                  </p>

                  {/* ACTIONS */}
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-primary w-100"
                      onClick={() => navigate(`/timetable/edit/${t._id}`)}
                    >
                      <FaEdit /> Edit
                    </button>

                    <button
                      className="btn btn-sm btn-danger w-100"
                      onClick={() => handleDelete(t._id)}
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
          transition: transform 0.2s ease;
        }

        .glass-card:hover {
          transform: translateY(-4px);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }
        `}
      </style>
    </div>
  );
}
