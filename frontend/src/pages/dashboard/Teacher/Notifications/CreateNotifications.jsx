import { useState } from "react";
import api from "../../../../api/axios";
import { FaBell, FaPaperPlane } from "react-icons/fa";

export default function CreateNotifications() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    priority: "NORMAL",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title || !form.message) {
      setError("Title and Message are required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title,
        message: form.message,
        type: form.type,
        priority: form.priority,
      };

      await api.post("/notifications/teacher/create", payload);

      setSuccess("✅ Notification sent to students!");
      setForm({
        title: "",
        message: "",
        type: "GENERAL",
        priority: "NORMAL",
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow mb-4">
        <h4 className="fw-bold mb-1">
          <FaBell className="me-2" />
          Create Notification
        </h4>
        <p className="opacity-75 mb-0">Send announcements to your students</p>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-7 col-md-10">
          <div className="card shadow border-0 rounded-4 glass-card">
            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger text-center">{error}</div>
              )}

              {success && (
                <div className="alert alert-success text-center">{success}</div>
              )}

              <form onSubmit={handleSubmit}>
                {/* TITLE */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Title</label>
                  <input
                    type="text"
                    name="title"
                    className="form-control"
                    placeholder="Enter title"
                    value={form.title}
                    onChange={handleChange}
                  />
                </div>

                {/* MESSAGE */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Message</label>
                  <textarea
                    name="message"
                    className="form-control"
                    rows="4"
                    placeholder="Enter message"
                    value={form.message}
                    onChange={handleChange}
                  />
                </div>

                {/* TYPE */}
                <div className="mb-3">
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

                <button
                  type="submit"
                  className="btn btn-primary w-100 mt-3 rounded-pill"
                  disabled={loading}
                >
                  {loading ? (
                    "Sending..."
                  ) : (
                    <>
                      <FaPaperPlane className="me-2" />
                      Send Notification
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* CSS */}
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
