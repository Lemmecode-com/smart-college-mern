import { useState } from "react";
import api from "../../../api/axios";

export default function CreateSessionModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    slot_id: "",
    lectureDate: "",
    lectureNumber: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post("/attendance/sessions", form);
      alert("Session created successfully");
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="modal d-block bg-dark bg-opacity-50">
      <div className="modal-dialog">
        <div className="modal-content p-3">
          <h5>Create Attendance Session</h5>

          <form onSubmit={handleSubmit}>
            <input
              className="form-control mb-2"
              placeholder="Slot ID"
              onChange={(e) =>
                setForm({ ...form, slot_id: e.target.value })
              }
              required
            />

            <input
              type="date"
              className="form-control mb-2"
              onChange={(e) =>
                setForm({ ...form, lectureDate: e.target.value })
              }
              required
            />

            <input
              type="number"
              className="form-control mb-3"
              placeholder="Lecture Number"
              onChange={(e) =>
                setForm({ ...form, lectureNumber: e.target.value })
              }
              required
            />

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-success">
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
