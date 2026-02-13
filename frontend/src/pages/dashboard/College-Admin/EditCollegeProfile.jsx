import { useEffect, useState } from "react";
import api from "../../../api/axios";
import {
  FaUniversity,
  FaSave,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaIdBadge,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function EditCollegeProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    code: "",
    email: "",
    contactNumber: "",
    address: "",
    establishedYear: "",
    logo: null
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  /* ================= LOAD COLLEGE ================= */
  useEffect(() => {
    const fetchCollege = async () => {
      try {
        const res = await api.get("/college/my-college");
        setForm({
          name: res.data.name || "",
          code: res.data.code || "",
          email: res.data.email || "",
          contactNumber: res.data.contactNumber || "",
          address: res.data.address || "",
          establishedYear: res.data.establishedYear || "",
          logo: null
        });
      } catch (err) {
        setError("Failed to load college profile");
      } finally {
        setLoading(false);
      }
    };

    fetchCollege();
  }, []);

  /* ================= CHANGE ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name,
        code: form.code,
        email: form.email,
        contactNumber: form.contactNumber,
        address: form.address,
        establishedYear: Number(form.establishedYear),
        logo: null
      };

      const res = await api.put("/college/edit/my-college", payload);

      setSuccess(res.data.message || "Profile updated successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update college profile"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <FaSpinner className="spin" size={30} />
        <p className="mt-2">Loading college profile...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* HEADER */}
      <div className="glass-header mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h4 className="fw-bold">
            <FaUniversity className="blink me-2" />
            Edit Institute Profile
          </h4>
          <p className="opacity-75 mb-0">
            Update your institute details
          </p>
        </div>
        <button
          className="btn btn-light"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft /> Back
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <FaExclamationTriangle className="me-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success d-flex align-items-center">
          <FaCheckCircle className="me-2" />
          {success}
        </div>
      )}

      {/* FORM */}
      <div className="row justify-content-center">
        <div className="col-lg-7">
          <div className="glass-card p-4 shadow">
            <form onSubmit={handleSubmit}>
              {/* NAME */}
              <div className="mb-3">
                <label className="form-label">
                  <FaUniversity className="me-2 text-primary blink" />
                  College Name
                </label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* CODE */}
              <div className="mb-3">
                <label className="form-label">
                  <FaIdBadge className="me-2 text-warning blink" />
                  College Code
                </label>
                <input
                  type="text"
                  name="code"
                  className="form-control"
                  value={form.code}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* EMAIL */}
              <div className="mb-3">
                <label className="form-label">
                  <FaEnvelope className="me-2 text-success blink" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* PHONE */}
              <div className="mb-3">
                <label className="form-label">
                  <FaPhone className="me-2 text-info blink" />
                  Contact Number
                </label>
                <input
                  type="text"
                  name="contactNumber"
                  className="form-control"
                  value={form.contactNumber}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* ADDRESS */}
              <div className="mb-3">
                <label className="form-label">
                  <FaMapMarkerAlt className="me-2 text-danger blink" />
                  Address
                </label>
                <textarea
                  name="address"
                  className="form-control"
                  rows="3"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>

              {/* YEAR */}
              <div className="mb-3">
                <label className="form-label">
                  <FaCalendarAlt className="me-2 text-secondary blink" />
                  Established Year
                </label>
                <input
                  type="number"
                  name="establishedYear"
                  className="form-control"
                  value={form.establishedYear}
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 rounded-pill mt-3"
                disabled={saving}
              >
                {saving ? "Saving..." : (
                  <>
                    <FaSave className="me-2" />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* CSS */}
      <style>{`
        .glass-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
          color: white;
          padding: 1.5rem;
          border-radius: 16px;
        }

        .glass-card {
          background: rgba(255,255,255,0.96);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          animation: fadeUp 0.6s ease;
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
