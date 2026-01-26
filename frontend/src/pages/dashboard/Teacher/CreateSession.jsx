import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaQrcode,
  FaCalendarAlt,
  FaClock,
  FaBookOpen
} from "react-icons/fa";

export default function CreateSession() {
  const { user } = useContext(AuthContext);

  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    timetable_id: "",
    lectureDate: "",
    lectureNumber: ""
  });

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH MY TIMETABLE ================= */
  useEffect(() => {
    const fetchMyTimetable = async () => {
      try {
        // ✅ CORRECT ENDPOINT
        const res = await api.get("/timetable/teacher");

        // ✅ CORRECT DATA PATH
        setTimetables(res.data.timetable || []);
      } catch (err) {
        console.error(err);
        setTimetables([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTimetable();
  }, []);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post("/attendance/sessions", form);
      alert("Attendance session created successfully");

      setForm({
        timetable_id: "",
        lectureDate: "",
        lectureNumber: ""
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create session");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Timetable...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaQrcode className="me-2 blink" />
          Create Attendance Session
        </h3>
        <p className="opacity-75 mb-0">
          Open a lecture session for student attendance
        </p>
      </div>

      {/* ================= FORM ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">

          <form onSubmit={handleSubmit}>
            <div className="row g-3">

              {/* Timetable */}
              <div className="col-md-12">
                <label className="fw-semibold">
                  <FaBookOpen className="me-2" />
                  Select Timetable Slot
                </label>
                <select
                  className="form-select"
                  name="timetable_id"
                  value={form.timetable_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Select Lecture Slot --</option>

                  {timetables.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.dayOfWeek} | {t.subject_id?.name} | 
                      {t.startTime} - {t.endTime} | Room {t.room}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="col-md-6">
                <label className="fw-semibold">
                  <FaCalendarAlt className="me-2" />
                  Lecture Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  name="lectureDate"
                  value={form.lectureDate}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Lecture Number */}
              <div className="col-md-6">
                <label className="fw-semibold">
                  <FaClock className="me-2" />
                  Lecture Number
                </label>
                <input
                  type="number"
                  className="form-control"
                  name="lectureNumber"
                  value={form.lectureNumber}
                  onChange={handleChange}
                  placeholder="Eg. 1, 2, 3"
                  required
                />
              </div>

            </div>

            <button
              className="btn btn-success w-100 mt-4"
              disabled={submitting}
            >
              {submitting ? "Creating Session..." : "Create Attendance Session"}
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
