import { useContext, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUniversity,
  FaUserShield,
  FaArrowLeft,
  FaCheckCircle,
  FaRegBuilding,
  FaUserCog
} from "react-icons/fa";

export default function CreateNewCollege() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "SUPER_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FORM STATE ================= */
  const [formData, setFormData] = useState({
    collegeName: "",
    collegeCode: "",
    collegeEmail: "",
    contactNumber: "",
    address: "",
    establishedYear: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const res = await api.post("/master/create/college", {
        ...formData,
        establishedYear: Number(formData.establishedYear),
      });

      setSuccess(res.data);

      setTimeout(() => {
        navigate("/super-admin/dashboard");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create college"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header mb-4 p-4 rounded-4 text-white shadow-lg">
        <h3 className="fw-bold mb-1">
          <FaUniversity className="blink me-2" />
          Create New College
        </h3>
        <p className="opacity-75 mb-0">
          Register a new college and generate admin access
        </p>
      </div>

      {/* ================= ALERTS ================= */}
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {success && (
        <div className="alert alert-success d-flex align-items-center gap-2">
          <FaCheckCircle className="blink" />
          <div>
            <strong>{success.message}</strong>
            <br />
            Admin Email:{" "}
            <strong>{success.collegeAdmin.email}</strong>
          </div>
        </div>
      )}

      {/* ================= FORM ================= */}
      <form onSubmit={handleSubmit}>
        <div className="card shadow-lg border-0 rounded-4 glass-card">

          <div className="card-body p-4">

            {/* COLLEGE INFO */}
            <SectionTitle
              icon={<FaRegBuilding className="blink-slow" />}
              title="College Information"
            />

            <div className="row g-3 mb-4">
              <Input label="College Name" name="collegeName" value={formData.collegeName} onChange={handleChange} />
              <Input label="College Code" name="collegeCode" value={formData.collegeCode} onChange={handleChange} />
              <Input label="College Email" name="collegeEmail" type="email" value={formData.collegeEmail} onChange={handleChange} />
              <Input label="Contact Number" name="contactNumber" value={formData.contactNumber} onChange={handleChange} />
              <Input label="Established Year" name="establishedYear" type="number" value={formData.establishedYear} onChange={handleChange} />

              <div className="col-md-12">
                <label className="form-label fw-semibold">
                  Address
                </label>
                <textarea
                  className="form-control"
                  rows="2"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* ADMIN INFO */}
            <SectionTitle
              icon={<FaUserCog className="blink-fast" />}
              title="College Admin Credentials"
            />

            <div className="row g-3">
              <Input label="Admin Name" name="adminName" value={formData.adminName} onChange={handleChange} />
              <Input label="Admin Email" name="adminEmail" type="email" value={formData.adminEmail} onChange={handleChange} />
              <Input label="Admin Password" name="adminPassword" type="password" value={formData.adminPassword} onChange={handleChange} />
            </div>
          </div>

          {/* ================= FOOTER ================= */}
          <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center p-3">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => navigate("/super-admin/dashboard")}
            >
              <FaArrowLeft className="me-1 blink-slow" />
              Back
            </button>

            <button
              className="btn btn-success px-4 rounded-pill pulse-btn"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create College"}
            </button>
          </div>
        </div>
      </form>

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(8px);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        .blink-slow {
          animation: blink 2.5s infinite;
        }

        .blink-fast {
          animation: blink 0.9s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }

        .form-control {
          transition: all 0.3s ease;
        }

        .form-control:focus {
          box-shadow: 0 0 0 0.2rem rgba(15,58,74,0.3);
          border-color: #0f3a4a;
        }

        .pulse-btn {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        `}
      </style>
    </div>
  );
}

/* ================= SECTION TITLE ================= */
function SectionTitle({ icon, title }) {
  return (
    <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2">
      <span className="text-success fs-5">{icon}</span>
      {title}
    </h5>
  );
}

/* ================= REUSABLE INPUT ================= */
function Input({ label, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">{label}</label>
      <input
        className="form-control"
        {...props}
        required
      />
    </div>
  );
}
