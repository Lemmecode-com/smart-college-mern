import { useState, useEffect } from "react";
import api from "../../../api/axios";

export default function CreateSessionModal({ onClose, onSuccess, slots }) {
  const [form, setForm] = useState({
    slot_id: "",
    lectureDate: "",
    lectureNumber: "1"
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Auto-set today's date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setForm(prev => ({ ...prev, lectureDate: today }));
  }, []);

  // ✅ Get selected slot details
  useEffect(() => {
    if (form.slot_id && slots) {
      const slot = slots.find(s => s._id === form.slot_id);
      setSelectedSlot(slot);
    }
  }, [form.slot_id, slots]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/attendance/sessions", form);
      alert("✅ Session created successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to create session";
      
      // ✅ Show specific validation errors
      if (err.response?.data?.code === 'ONLY_TODAY_ALLOWED') {
        alert("⚠️ Attendance sessions can only be created for today");
      } else if (err.response?.data?.code === 'DATE_DAY_MISMATCH') {
        alert("⚠️ Selected date does not match slot's day");
      } else if (err.response?.data?.code === 'NOT_SUBJECT_TEACHER') {
        alert("🔒 Access denied: You are not the assigned teacher for this subject");
      } else if (err.response?.data?.code === 'PAST_DATE_NOT_ALLOWED') {
        alert("⚠️ Cannot create session for past dates");
      } else if (err.response?.data?.code === 'DUPLICATE_SESSION') {
        alert("⚠️ Attendance session already created for this lecture");
      } else {
        alert("❌ " + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal d-block bg-dark bg-opacity-50">
      <div className="modal-dialog">
        <div className="modal-content p-3">
          <h5 className="mb-3">Create Attendance Session</h5>

          {/* ℹ️ Info Box */}
          {selectedSlot && (
            <div className="alert alert-info mb-3">
              <small>
                <strong>📚 Subject:</strong> {selectedSlot.subject?.name || selectedSlot.slotSnapshot?.subject_name}<br/>
                <strong>👨‍🏫 Teacher:</strong> {selectedSlot.teacher?.name || selectedSlot.slotSnapshot?.teacher_name}<br/>
                <strong>📅 Day:</strong> {selectedSlot.day || selectedSlot.slotSnapshot?.day}<br/>
                <strong>🕐 Time:</strong> {selectedSlot.startTime || selectedSlot.slotSnapshot?.startTime} - {selectedSlot.endTime || selectedSlot.slotSnapshot?.endTime}
              </small>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Slot Selection */}
            <label className="form-label">Select Slot *</label>
            <select
              className="form-control mb-3"
              value={form.slot_id}
              onChange={(e) => setForm({ ...form, slot_id: e.target.value })}
              required
            >
              <option value="">-- Select a Slot --</option>
              {slots?.map(slot => (
                <option key={slot._id} value={slot._id}>
                  {slot.subject?.name || slot.slotSnapshot?.subject_name} - {slot.day} {slot.startTime}
                </option>
              ))}
            </select>

            {/* Date Field (Auto-filled with today, disabled) */}
            <label className="form-label">
              Lecture Date * 
              <small className="text-muted ms-2">(Today only)</small>
            </label>
            <input
              type="date"
              className="form-control mb-3"
              value={form.lectureDate}
              onChange={(e) => setForm({ ...form, lectureDate: e.target.value })}
              required
              // Optional: Disable to enforce today-only
              // disabled
            />

            {/* Lecture Number */}
            <label className="form-label">Lecture Number *</label>
            <input
              type="number"
              className="form-control mb-3"
              value={form.lectureNumber}
              onChange={(e) => setForm({ ...form, lectureNumber: e.target.value })}
              min="1"
              required
            />

            <div className="d-flex justify-content-end gap-2">
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
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}