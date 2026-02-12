import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import { AuthContext } from "../../../../auth/AuthContext";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const TIMES = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "12:00", end: "01:00" },
  { start: "01:00", end: "02:00" },
  { start: "02:00", end: "03:00" },
  { start: "03:00", end: "04:00" },
  { start: "04:00", end: "05:00" },
];

export default function WeeklyTimetable() {
  const { timetableId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [timetable, setTimetable] = useState(null);
  const [weekly, setWeekly] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editSlot, setEditSlot] = useState(null);

  const [form, setForm] = useState({
    timetable_id: "",
    day: "MON",
    startTime: "",
    endTime: "",
    subject_id: "",
    teacher_id: "",
    room: "",
    slotType: "LECTURE",
  });

  const isHOD = true; // 🔒 backend enforces real check

  /* ================= LOAD WEEKLY ================= */
  useEffect(() => {
    if (!timetableId) return;

    const load = async () => {
      try {
        const res = await api.get(`/timetable/${timetableId}/weekly`);
        setTimetable(res.data.timetable);
        setWeekly(res.data.weekly);
        setForm(f => ({ ...f, timetable_id: res.data.timetable._id }));

        const [subRes, teachRes] = await Promise.all([
          api.get(`/subjects/course/${res.data.timetable.course_id}`),
          api.get(`/teachers/department/${res.data.timetable.department_id}`),
        ]);

        setSubjects(subRes.data);
        setTeachers(teachRes.data);
      } catch {
        setError("Failed to load weekly timetable");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [timetableId]);

  /* ================= AUTO SET TEACHER ================= */
  useEffect(() => {
    if (!form.subject_id) return;
    const subject = subjects.find(s => s._id === form.subject_id);
    if (subject?.teacher_id?._id) {
      setForm(prev => ({ ...prev, teacher_id: subject.teacher_id._id }));
    }
  }, [form.subject_id, subjects]);

  /* ================= ACTIONS ================= */
  const openCreate = (day, time) => {
    setEditSlot(null);
    setForm({
      timetable_id: timetable._id,
      day,
      startTime: time.start,
      endTime: time.end,
      subject_id: "",
      teacher_id: "",
      room: "",
      slotType: "LECTURE",
    });
    setShowModal(true);
  };

  const openEdit = (slot, day) => {
    setEditSlot(slot);
    setForm({
      timetable_id: timetable._id,
      day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject_id: slot.subject_id?._id,
      teacher_id: slot.teacher_id?._id,
      room: slot.room || "",
      slotType: slot.slotType,
    });
    setShowModal(true);
  };

  const submitSlot = async () => {
    try {
      if (editSlot) {
        await api.put(`/timetable/slot/${editSlot._id}`, form);
      } else {
        await api.post("/timetable/slot", form);
      }
      setShowModal(false);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Cannot Modified Published Timetable or Only HOD Have Access for It.");
    }
  };

  const deleteSlot = async (slotId) => {
    if (!window.confirm("Delete this slot?")) return;
    try {
      await api.delete(`/timetable/slot/${slotId}`);
      window.location.reload();
    } catch {
      alert("Delete failed (Only HOD allowed)");
    }
  };

  if (loading) return <p className="p-4">Loading...</p>;
  if (error) return <div className="alert alert-danger m-4">{error}</div>;

  return (
    <div className="container py-4">
      <h4 className="fw-bold mb-2">Weekly Timetable</h4>
      <p className="text-muted">
        {timetable.name} • Sem {timetable.semester} • {timetable.academicYear} • {timetable.status}
      </p>

      <div className="table-responsive">
        <table className="table table-bordered text-center">
          <thead className="table-light">
            <tr>
              <th>Time</th>
              {DAYS.map(d => <th key={d}>{d}</th>)}
            </tr>
          </thead>

          <tbody>
            {TIMES.map(t => (
              <tr key={t.start}>
                <td className="fw-semibold">{t.start} - {t.end}</td>

                {DAYS.map(day => {
                  const slot = weekly?.[day]?.find(
                    s => s.startTime === t.start && s.endTime === t.end
                  );

                  return (
                    <td key={day}>
                      {slot ? (
                        <div className="p-2 bg-light rounded text-start">
                          <div className="fw-bold">{slot.subject_id?.name}</div>
                          <small>{slot.teacher_id?.name}</small>

                          <div className="mt-1">
                            <span className="badge bg-primary me-1">{slot.slotType}</span>
                            {slot.room && <span className="badge bg-secondary">Room {slot.room}</span>}
                          </div>

                          {isHOD && (
                            <div className="mt-2 d-flex gap-2">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openEdit(slot, day)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteSlot(slot._id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        isHOD && (
                          <button
                            className="btn btn-sm btn-light w-100"
                            onClick={() => openCreate(day, t)}
                          >
                            +
                          </button>
                        )
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal show d-block bg-dark bg-opacity-50">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3">
              <h5 className="fw-bold mb-3">
                {editSlot ? "Edit Slot" : "Add Slot"}
              </h5>

              <select
                className="form-select mb-2"
                value={form.subject_id}
                onChange={e => setForm({ ...form, subject_id: e.target.value })}
              >
                <option value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>

              <input
                className="form-control mb-2"
                value={teachers.find(t => t._id === form.teacher_id)?.name || ""}
                disabled
              />

              <input
                className="form-control mb-2"
                placeholder="Room"
                value={form.room}
                onChange={e => setForm({ ...form, room: e.target.value })}
              />

              <select
                className="form-select mb-3"
                value={form.slotType}
                onChange={e => setForm({ ...form, slotType: e.target.value })}
              >
                <option value="LECTURE">Lecture</option>
                <option value="LAB">Lab</option>
              </select>

              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-success" onClick={submitSlot}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
