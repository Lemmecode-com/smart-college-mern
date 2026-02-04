import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaBell,
  FaCalendarAlt,
  FaSave,
  FaArrowLeft
} from "react-icons/fa";

export default function UpdateNotifications() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    priority: "LOW",
    expiresAt: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= LOAD EXISTING ================= */
  useEffect(() => {
    const loadNote = async () => {
      try {
        const res = await api.get(`/notifications/admin/read`);
        const all = [
          ...res.data.myNotifications,
          ...res.data.staffNotifications
        ];
        const note = all.find((n) => n._id === id);

        if (!note) {
          setError("Notification not found");
          return;
        }

        setForm({
          title: note.title,
          message: note.message,
          type: note.type,
          priority: "LOW",
          expiresAt: note.expiresAt
            ? note.expiresAt.slice(0, 16)
            : ""
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load notification");
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [id]);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= UPDATE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title,
        message: form.message,
        type: form.type,
        priority: form.priority,
        expiresAt: form.expiresAt || null
      };

      await api.put(`/notifications/edit-note/${id}`, payload);

      setSuccess("✅ Notification updated successfully!");
      setTimeout(() => navigate("/notifications"), 1200);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <FaBell className="fs-2 text-muted" />
        <p className="text-muted mt-2">Loading notification...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger text-center">{error}</div>;
  }

  return (
    <div className="container-fluid">
      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h4 className="fw-bold mb-1">
            <FaBell className="me-2" /> Update Notification
          </h4>
          <p className="opacity-75 mb-0">
            Modify your announcement details
          </p>
        </div>
        <button className="btn btn-light" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-7 col-md-10">
          <div className="card shadow border-0 rounded-4 glass-card">
            <div className="card-body p-4">

              {success && (
                <div className="alert alert-success text-center">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* TITLE */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Title</label>
                  <input
                    type="text"
                    name="title"
                    className="form-control"
                    value={form.title}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* MESSAGE */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Message</label>
                  <textarea
                    name="message"
                    className="form-control"
                    rows="4"
                    value={form.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="row g-3">
                  {/* TYPE */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Type</label>
                    <select
                      className="form-select"
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                    >
                      <option>GENERAL</option>
                      <option>ACADEMIC</option>
                      <option>EXAM</option>
                      <option>FEE</option>
                      <option>ATTENDANCE</option>
                      <option>EVENT</option>
                      <option>ASSIGNMENT</option>
                      <option>URGENT</option>
                    </select>
                  </div>

                  {/* PRIORITY */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Priority</label>
                    <select
                      className="form-select"
                      name="priority"
                      value={form.priority}
                      onChange={handleChange}
                    >
                      <option>LOW</option>
                      <option>MEDIUM</option>
                      <option>HIGH</option>
                    </select>
                  </div>
                </div>

                {/* EXPIRY */}
                <div className="mt-3">
                  <label className="form-label fw-semibold">
                    <FaCalendarAlt className="me-1" /> Expiry Date
                  </label>
                  <input
                    type="datetime-local"
                    name="expiresAt"
                    className="form-control"
                    value={form.expiresAt}
                    onChange={handleChange}
                  />
                </div>

                {/* SUBMIT */}
                <button
                  type="submit"
                  className="btn btn-success w-100 mt-4 rounded-pill"
                  disabled={saving}
                >
                  {saving ? "Updating..." : (
                    <>
                      <FaSave className="me-2" />
                      Update Notification
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }
        .glass-card {
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(8px);
        }
      `}</style>
    </div>
  );
}
