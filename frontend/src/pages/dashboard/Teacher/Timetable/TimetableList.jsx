import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";

import { FaCalendarAlt, FaCheckCircle, FaTrash, FaEye, FaEdit } from "react-icons/fa";

export default function TimetableList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isTeacher = user?.role === "TEACHER";

  useEffect(() => {
    fetchTimetables();
  }, []);

  /* ================= FETCH ================= */
  const fetchTimetables = async () => {
    try {
      const res = await api.get("/timetable");
      setTimetables(res.data);
    } catch (err) {
      setError("Failed to load timetables");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PUBLISH ================= */
  const publishTimetable = async (id) => {
    if (!window.confirm("Publish this timetable?")) return;

    try {
      await api.put(`/timetable/${id}/publish`);
      fetchTimetables();
    } catch {
      alert("Failed to publish timetable");
    }
  };

  /* ================= DELETE ================= */
  const deleteTimetable = async (id) => {
    if (!window.confirm("Delete this timetable?")) return;

    try {
      await api.delete(`/timetable/${id}`);
      fetchTimetables();
    } catch {
      alert("Failed to delete timetable");
    }
  };

  /* ================= EDIT ================= */
  const editTimetable = (id) => {
    navigate(`/timetable/${id}/edit`);
  };

  if (loading) {
    return <p className="text-center mt-4">Loading...</p>;
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold">
          <FaCalendarAlt className="me-2" />
          Timetables
        </h4>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/timetable/create')}
        >
          <FaCalendarAlt className="me-1" /> Create Timetable
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Semester</th>
              <th>Academic Year</th>
              <th>Status</th>
              <th width="280">Actions</th>
            </tr>
          </thead>

          <tbody>
            {timetables.map((t) => (
              <tr key={t._id}>
                <td className="fw-semibold">{t.name}</td>
                <td>{t.semester}</td>
                <td>{t.academicYear}</td>
                <td>
                  <span
                    className={`badge ${
                      t.status === "PUBLISHED"
                        ? "bg-success"
                        : "bg-warning text-dark"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>

                <td>
                  {/* VIEW WEEKLY TIMETABLE */}
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => navigate(`/timetable/${t._id}/weekly`)}
                    title="View Weekly Timetable"
                  >
                    <FaEye /> View
                  </button>

                  {/* EDIT TIMETABLE */}
                  <button
                    className="btn btn-sm btn-outline-info me-2"
                    onClick={() => editTimetable(t._id)}
                    disabled={t.status === "PUBLISHED"}
                    title={t.status === "PUBLISHED" ? "Cannot edit published timetable" : "Edit Timetable"}
                  >
                    <FaEdit /> Edit
                  </button>

                  {/* HOD ACTIONS (BACKEND WILL VERIFY) */}
                  {isTeacher && t.status === "DRAFT" && (
                    <>
                      <button
                        className="btn btn-sm btn-success me-2"
                        onClick={() => publishTimetable(t._id)}
                        title="Publish Timetable"
                      >
                        <FaCheckCircle /> Publish
                      </button>
                    </>
                  )}

                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteTimetable(t._id)}
                    title="Delete Timetable"
                  >
                    <FaTrash /> Delete
                  </button>
                </td>
              </tr>
            ))}

            {timetables.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-muted">
                  No timetables found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
