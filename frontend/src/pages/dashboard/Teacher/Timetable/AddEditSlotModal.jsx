import { useState, useEffect } from "react";
import api from "../../../../api/axios";
import { toast } from "react-toastify";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

export default function AddEditSlotModal({ 
  mode, 
  slot, 
  day: initialDay, 
  timeRange, 
  timetableId, 
  onClose, 
  onSuccess 
}) {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    day: initialDay || "MON",
    startTime: "",
    endTime: "",
    subject_id: "",
    teacher_id: "",
    room: "",
    slotType: "LECTURE",
  });

  // Initialize form values
  useEffect(() => {
    if (mode === "edit" && slot) {
      setForm({
        day: slot.day || "MON",
        startTime: slot.startTime || "09:00",
        endTime: slot.endTime || "10:00",
        subject_id: slot.subject_id?._id || "",
        teacher_id: slot.teacher_id?._id || "",
        room: slot.room || "",
        slotType: slot.slotType || "LECTURE",
      });
    } else if (mode === "add" && timeRange) {
      const [start, end] = timeRange.split('-');
      setForm(prev => ({
        ...prev,
        day: initialDay || "MON",
        startTime: start.trim(),
        endTime: end.trim(),
      }));
    }
  }, [mode, slot, timeRange, initialDay]);

  // Load subjects and teachers
  useEffect(() => {
    const loadData = async () => {
      try {
        const [subjectsRes, teachersRes] = await Promise.all([
          api.get("/subjects"),
          api.get("/teachers")
        ]);
        setSubjects(subjectsRes.data);
        setTeachers(teachersRes.data);
      } catch (error) {
        console.error("Failed to load subjects/teachers:", error);
      }
    };
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...form,
        timetable_id: timetableId,
        day: form.day,
        startTime: form.startTime,
        endTime: form.endTime,
      };

      if (mode === "edit" && slot?._id) {
        await api.put(`/timetable/slot/${slot._id}`, payload);
      } else {
        await api.post("/timetable/slot", payload);
      }

      toast.success(mode === "edit" ? "Slot updated successfully!" : "Slot added successfully!", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save slot:", error);
      toast.error(mode === "edit" ? "Failed to update slot" : "Failed to add slot", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="mb-4">{mode === "edit" ? "Edit Slot" : "Add New Slot"}</h4>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Day</label>
            <select 
              className="form-select"
              name="day"
              value={form.day}
              onChange={handleChange}
              required
            >
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="row mb-3">
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

          <div className="mb-3">
            <label className="form-label">Subject</label>
            <select
              className="form-select"
              name="subject_id"
              value={form.subject_id}
              onChange={handleChange}
              required
            >
              <option value="">Select subject</option>
              {subjects.map(sub => (
                <option key={sub._id} value={sub._id}>
                  {sub.name} - {sub.code}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Teacher</label>
            <select
              className="form-select"
              name="teacher_id"
              value={form.teacher_id}
              onChange={handleChange}
              required
            >
              <option value="">Select teacher</option>
              {teachers.map(teacher => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.name} ({teacher.department})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Room</label>
            <input
              type="text"
              className="form-control"
              name="room"
              value={form.room}
              onChange={handleChange}
              placeholder="e.g., Lab-3, Room 205"
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label">Slot Type</label>
            <select
              className="form-select"
              name="slotType"
              value={form.slotType}
              onChange={handleChange}
            >
              <option value="LECTURE">Lecture</option>
              <option value="TUTORIAL">Tutorial</option>
              <option value="PRACTICAL">Practical</option>
              <option value="LAB">Lab Session</option>
            </select>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Saving..." : (mode === "edit" ? "Update Slot" : "Add Slot")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}