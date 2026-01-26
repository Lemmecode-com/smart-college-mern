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
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH ADMIN TIMETABLE ================= */
  const fetchTimetable = async () => {
    try {
      const res = await api.get("/timetable/admin");
      setTimetable(res.data.timetable || []);
    } catch (err) {
      console.error(err);
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
    const confirm = window.confirm(
      "Are you sure you want to delete this timetable slot?"
    );
    if (!confirm) return;

    try {
      await api.delete(`/timetable/${id}`);
      alert("Timetable slot deleted successfully");
      fetchTimetable(); // refresh list
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
      <div className="d-flex justify-content-between align-items-center gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <FaCalendarAlt className="me-2 blink" />
            College Timetable
          </h3>
          <p className="opacity-75 mb-0">
            Complete academic schedule for all departments
          </p>
        </div>

        {/* ADD BUTTON */}
        <button
          className="btn btn-light fw-semibold"
          onClick={() => navigate("/timetable/create")}
        >
          <FaPlus className="me-2" />
          Add Timetable
        </button>
      </div>

      {/* ================= TABLE ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body">

          {timetable.length === 0 ? (
            <div className="alert alert-info">
              No timetable slots created yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Course</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Type</th>
                    <th>Room</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timetable.map((t) => (
                    <tr key={t._id}>
                      <td className="fw-bold">{t.dayOfWeek}</td>
                      <td>
                        <FaClock className="me-1 text-primary" />
                        {t.startTime} - {t.endTime}
                      </td>
                      <td>
                        <FaBook className="me-1 text-success" />
                        {t.subject_id?.name}
                      </td>
                      <td>
                        <FaChalkboardTeacher className="me-1 text-warning" />
                        {t.teacher_id?.name}
                      </td>
                      <td>
                        <FaLayerGroup className="me-1" />
                        {t.course_id?.name}
                      </td>
                      <td>{t.department_id?.name}</td>
                      <td>{t.semester}</td>
                      <td>{t.lectureType}</td>
                      <td>
                        <FaBuilding className="me-1" />
                        {t.room}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            t.status === "ACTIVE"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-primary me-2"
                          onClick={() =>
                            navigate(`/timetable/edit/${t._id}`)
                          }
                        >
                          <FaEdit />
                        </button>

                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(t._id)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
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
