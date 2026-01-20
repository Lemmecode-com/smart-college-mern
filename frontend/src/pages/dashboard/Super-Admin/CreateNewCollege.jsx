import { useContext, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

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
      const res = await api.post("/master/colleges", {
        ...formData,
        establishedYear: Number(formData.establishedYear),
      });

      setSuccess(res.data);

      // Optional redirect after success
      setTimeout(() => {
        navigate("/super-admin/colleges");
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
      <div className="row justify-content-center">
        <div className="col-lg-9 col-xl-8">

          {/* ================= HEADER ================= */}
          <div className="mb-4">
            <h3 className="fw-bold">Create New College</h3>
            <p className="text-muted">
              Add a new college and assign a College Admin
            </p>
          </div>

          {/* ================= ALERTS ================= */}
          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          {success && (
            <div className="alert alert-success">
              <strong>{success.message}</strong>
              <br />
              Admin Email:{" "}
              <strong>{success.collegeAdmin.email}</strong>
            </div>
          )}

          {/* ================= FORM ================= */}
          <form onSubmit={handleSubmit}>
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-body p-4">

                {/* COLLEGE INFO */}
                <h5 className="fw-semibold mb-3">
                  College Information
                </h5>

                <div className="row g-3 mb-4">
                  <Input
                    label="College Name"
                    name="collegeName"
                    value={formData.collegeName}
                    onChange={handleChange}
                  />
                  <Input
                    label="College Code"
                    name="collegeCode"
                    value={formData.collegeCode}
                    onChange={handleChange}
                  />
                  <Input
                    label="College Email"
                    name="collegeEmail"
                    type="email"
                    value={formData.collegeEmail}
                    onChange={handleChange}
                  />
                  <Input
                    label="Contact Number"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleChange}
                  />
                  <Input
                    label="Established Year"
                    name="establishedYear"
                    type="number"
                    value={formData.establishedYear}
                    onChange={handleChange}
                  />
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
                <h5 className="fw-semibold mb-3">
                  College Admin Credentials
                </h5>

                <div className="row g-3">
                  <Input
                    label="Admin Name"
                    name="adminName"
                    value={formData.adminName}
                    onChange={handleChange}
                  />
                  <Input
                    label="Admin Email"
                    name="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={handleChange}
                  />
                  <Input
                    label="Admin Password"
                    name="adminPassword"
                    type="password"
                    value={formData.adminPassword}
                    onChange={handleChange}
                  />
                </div>

              </div>

              {/* ================= FOOTER ================= */}
              <div className="card-footer bg-white border-0 text-end p-3">
                <button
                  className="btn btn-secondary me-2"
                  type="button"
                  onClick={() =>
                    navigate("/super-admin/dashboard")
                  }
                >
                  Cancel
                </button>

                <button
                  className="btn btn-primary px-4"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create College"}
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
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
