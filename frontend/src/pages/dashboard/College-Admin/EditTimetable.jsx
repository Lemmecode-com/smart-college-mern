import { useContext, useEffect, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaEdit,
  FaCalendarAlt,
  FaClock,
  FaBook,
  FaChalkboardTeacher,
  FaDoorOpen
} from "react-icons/fa";

export default function EditTimetable() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    department_id: "",
    course_id: "",
    subject_id: "",
    teacher_id: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    academicYear: "",
    semester: "",
    lectureType: "THEORY",
    room: ""
  });

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH SLOT DATA ================= */
  useEffect(() => {
    const fetchSlot = async () => {
      try {
        const res = await api.get("/timetable/admin");
        const slot = res.data.timetable.find((t) => t._id === id);

        if (!slot) {
          alert("Timetable slot not found");
          navigate("/timetable/view");
          return;
        }

        setForm({
          department_id: slot.department_id?._id || slot.department_id,
          course_id: slot.course_id?._id || slot.course_id,
          subject_id: slot.subject_id?._id || slot.subject_id,
          teacher_id: slot.teacher_id?._id || slot.teacher_id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          academicYear: slot.academicYear,
          semester: slot.semester,
          lectureType: slot.lectureType,
          room: slot.room || ""
        });
      } catch (err) {
        alert("Failed to load timetable slot");
      } finally {
        setLoading(false);
      }
    };

    fetchSlot();
  }, [id, navigate]);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.put(`/timetable/${id}`, form);
      alert("Timetable slot updated successfully");
      navigate("/timetable/view");
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Timetable Slot...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaEdit className="me-2 blink" />
          Edit Timetable Slot
        </h3>
        <p className="opacity-75 mb-0">
          Update lecture schedule
        </p>
      </div>

      {/* ================= FORM ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">

          <form onSubmit={handleSubmit}>
            <div className="row g-3">

              <div className="col-md-4">
                <label className="fw-semibold">
                  <FaCalendarAlt className="me-2" />
                  Day
                </label>
                <select
                  className="form-select"
                  name="dayOfWeek"
                  value={form.dayOfWeek}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select</option>
                  <option value="MON">MON</option>
                  <option value="TUE">TUE</option>
                  <option value="WED">WED</option>
                  <option value="THU">THU</option>
                  <option value="FRI">FRI</option>
                  <option value="SAT">SAT</option>
                </select>
              </div>

              <div className="col-md-4">
                <label className="fw-semibold">
                  <FaClock className="me-2" />
                  Start Time
                </label>
                <input
                  type="time"
                  className="form-control"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="fw-semibold">
                  <FaClock className="me-2" />
                  End Time
                </label>
                <input
                  type="time"
                  className="form-control"
                  name="endTime"
                  value={form.endTime}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="fw-semibold">
                  <FaBook className="me-2" />
                  Lecture Type
                </label>
                <select
                  className="form-select"
                  name="lectureType"
                  value={form.lectureType}
                  onChange={handleChange}
                >
                  <option value="THEORY">THEORY</option>
                  <option value="PRACTICAL">PRACTICAL</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="fw-semibold">
                  <FaDoorOpen className="me-2" />
                  Room
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="room"
                  value={form.room}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="fw-semibold">Academic Year</label>
                <input
                  type="text"
                  className="form-control"
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="fw-semibold">Semester</label>
                <input
                  type="number"
                  className="form-control"
                  name="semester"
                  value={form.semester}
                  onChange={handleChange}
                  required
                />
              </div>

            </div>

            <button
              className="btn btn-primary w-100 mt-4"
              disabled={submitting}
            >
              {submitting ? "Updating..." : "Update Timetable Slot"}
            </button>

          </form>
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
