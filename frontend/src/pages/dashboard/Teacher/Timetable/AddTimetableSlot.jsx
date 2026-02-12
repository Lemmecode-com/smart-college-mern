import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import api from "../../../../api/axios";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function AddTimetableSlot() {
  const [params] = useSearchParams();
  const timetableFromUrl = params.get("timetable");

  /* ================= STATE ================= */
  const [timetables, setTimetables] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [form, setForm] = useState({
    timetable_id: timetableFromUrl || "",
    day: "MON",
    startTime: "",
    endTime: "",
    subject_id: "",
    teacher_id: "",
    room: "",
    slotType: "LECTURE",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= LOAD TIMETABLES ================= */
  useEffect(() => {
    const loadTimetables = async () => {
      try {
        const res = await api.get("/timetable");
        setTimetables(res.data);
      } catch {
        setError("Failed to load timetables");
      } finally {
        setLoading(false);
      }
    };
    loadTimetables();
  }, []);

  /* ================= LOAD SUBJECTS + TEACHERS ================= */
  useEffect(() => {
    if (!form.timetable_id) return;

    const timetable = timetables.find(t => t._id === form.timetable_id);
    if (!timetable) return;

    const loadDeps = async () => {
      try {
        const [subjectsRes, teachersRes] = await Promise.all([
          api.get(`/subjects/course/${timetable.course_id}`),
          api.get(`/teachers/department/${timetable.department_id}`)
        ]);

        setSubjects(subjectsRes.data);
        setTeachers(teachersRes.data);
      } catch {
        setError("Failed to load subjects or teachers");
      }
    };

    loadDeps();
  }, [form.timetable_id, timetables]);

  /* ================= AUTO-SET TEACHER FROM SUBJECT ================= */
  useEffect(() => {
    if (!form.subject_id) return;

    const subject = subjects.find(s => s._id === form.subject_id);
    if (subject?.teacher_id?._id) {
      setForm(prev => ({
        ...prev,
        teacher_id: subject.teacher_id._id
      }));
    }
  }, [form.subject_id, subjects]);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setError("");
    setSuccess("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await api.post("/timetable/slot", {
        ...form,
        startTime: form.startTime,
        endTime: form.endTime,
      });

      setSuccess("Timetable slot added successfully");

      setForm(prev => ({
        ...prev,
        startTime: "",
        endTime: "",
        subject_id: "",
        teacher_id: "",
        room: "",
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add slot");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-center mt-5">Loading...</p>;

  /* ================= UI ================= */
  return (
    <div className="container py-4">
      <div className="card shadow border-0 mx-auto" style={{ maxWidth: 520 }}>
        <div className="card-body">
          <h4 className="fw-bold mb-3">Add Timetable Slot</h4>

          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={submitHandler}>
            {/* Timetable */}
            <div className="mb-3">
              <label className="form-label">Timetable</label>
              <select
                className="form-select"
                name="timetable_id"
                value={form.timetable_id}
                onChange={handleChange}
                required
              >
                <option value="">Select timetable</option>
                {timetables.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Day */}
            <div className="mb-3">
              <label className="form-label">Day</label>
              <select
                className="form-select"
                name="day"
                value={form.day}
                onChange={handleChange}
              >
                {DAYS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Time */}
            <div className="row">
              <div className="col">
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  className="form-control"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col">
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  className="form-control"
                  name="endTime"
                  value={form.endTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Subject */}
            <div className="mb-3 mt-3">
              <label className="form-label">Subject</label>
              <select
                className="form-select"
                name="subject_id"
                value={form.subject_id}
                onChange={handleChange}
                required
              >
                <option value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher (LOCKED) */}
            <div className="mb-3">
              <label className="form-label">Teacher</label>
              <input
                className="form-control"
                value={
                  teachers.find(t => t._id === form.teacher_id)?.name || ""
                }
                disabled
              />
            </div>

            {/* Room */}
            <div className="mb-3">
              <label className="form-label">Room</label>
              <input
                className="form-control"
                name="room"
                value={form.room}
                onChange={handleChange}
              />
            </div>

            {/* Slot Type */}
            <div className="mb-4">
              <label className="form-label">Slot Type</label>
              <select
                className="form-select"
                name="slotType"
                value={form.slotType}
                onChange={handleChange}
              >
                <option value="LECTURE">Lecture</option>
                <option value="LAB">Lab</option>
              </select>
            </div>

            <button
              className="btn btn-success w-100"
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add Slot"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
