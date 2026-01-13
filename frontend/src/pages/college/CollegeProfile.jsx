import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function CollegeProfile() {
  const [collegeId, setCollegeId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "",
    phone: "",
    email: "",
    logo: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ================= FETCH COLLEGE ================= */
  useEffect(() => {
    const fetchCollege = async () => {
      try {
        const res = await api.get("/college");
        if (res.data) {
          setCollegeId(res.data._id);
          setForm({
            name: res.data.name || "",
            address: res.data.address || "",
            city: res.data.city || "",
            state: res.data.state || "",
            country: res.data.country || "",
            phone: res.data.phone || "",
            email: res.data.email || "",
            logo: res.data.logo || ""
          });
        }
      } catch {
        console.log("College profile not found");
      } finally {
        setLoading(false);
      }
    };

    fetchCollege();
  }, []);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SAVE COLLEGE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (collegeId) {
        await api.put(`/college/${collegeId}`, form);
        alert("College profile updated successfully");
      } else {
        const res = await api.post("/college", form);
        setCollegeId(res.data._id);
        alert("College profile created successfully");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center mt-4">Loading college profile...</p>;

  return (
    <div
      className="container-fluid py-2"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #ffffff, #ffffff)"
      }}
    >
      <div className="container">
        <div
          className="card shadow-lg border-0"
          style={{ borderRadius: "16px" }}
        >
          <div className="card-body p-4 p-md-5">
            <h4 className="mb-4 text-dark fw-bold">
              College Profile
            </h4>

            <form onSubmit={handleSubmit}>
              {/* College Name */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  College Name *
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Address */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Address *
                </label>
                <textarea
                  className="form-control"
                  rows="2"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="row">
                {/* City */}
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">
                    City *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* State */}
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">
                    State *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Country */}
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">
                    Country *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="row">
                {/* Phone */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">
                    Phone *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Email */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">
                    Email *
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Logo */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  College Logo URL
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="logo"
                  value={form.logo}
                  onChange={handleChange}
                />
              </div>

              <button
                className="btn btn-dark px-4 py-2"
                disabled={saving}
                style={{ borderRadius: "10px" }}
              >
                {saving ? "Saving..." : "Save College Profile"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
