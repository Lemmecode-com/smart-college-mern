import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import { FaBell, FaSave, FaArrowLeft } from "react-icons/fa";
import { AuthContext } from "../../../../auth/AuthContext";

export default function EditNotifications() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    expiresAt: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ================= LOAD EXISTING ================= */
  useEffect(() => {
    const loadNote = async () => {
      try {
        let res;

        // Role-based fetch
        if (user.role === "COLLEGE_ADMIN") {
          res = await api.get("/notifications/admin/read");
        } else {
          res = await api.get("/notifications/teacher/read");
        }

        let all = [];

        if (user.role === "COLLEGE_ADMIN") {
          all = [
            ...(res.data.myNotifications || []),
            ...(res.data.staffNotifications || [])
          ];
        } else {
          all = [
            ...(res.data.myNotifications || []),
            ...(res.data.adminNotifications || [])
          ];
        }

        const found = all.find(n => n._id === id);

        if (!found) {
          setError("Notification not found");
        } else {
          setForm({
            title: found.title,
            message: found.message,
            type: found.type,
            expiresAt: found.expiresAt
              ? found.expiresAt.slice(0, 16)
              : ""
          });
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load notification");
      } finally {
        setLoading(false);
      }
    };

    if (user) loadNote();
  }, [id, user]);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= UPDATE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await api.put(`/notifications/edit-note/${id}`, {
        title: form.title,
        message: form.message,
        type: form.type,
        expiresAt: form.expiresAt || null
      });

      alert("✅ Notification updated successfully");
      navigate("/notifications");
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Failed to update notification"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <h6 className="text-muted">Loading...</h6>
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
            <FaBell className="me-2" />
            Edit Notification
          </h4>
          <p className="opacity-75 mb-0">
            Update your announcement
          </p>
        </div>

        <button
          className="btn btn-light"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft className="me-1" /> Back
        </button>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-7 col-md-10">
          <div className="card shadow border-0 rounded-4 glass-card">
            <div className="card-body p-4">
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

                {/* EXPIRY */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Expiry Date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="expiresAt"
                    className="form-control"
                    value={form.expiresAt}
                    onChange={handleChange}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 mt-3 rounded-pill"
                  disabled={saving}
                >
                  {saving ? "Saving..." : (
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
