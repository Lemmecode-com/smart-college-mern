import { useState } from "react";
import api from "../../api/axios";

export default function AddTeacher() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        role: "teacher",
      });

      alert("Teacher created successfully");

      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create teacher");
    }

    setLoading(false);
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          {/* Header */}
          <div
            className="p-3 mb-4 text-center"
            style={{
              background: "linear-gradient(180deg, #0f3a4a, #134952)",
              borderRadius: "12px",
              color: "white",
            }}
          >
            <h5 className="mb-1">Add Teacher</h5>
            <small className="text-white-50">
              Faculty Registration
            </small>
          </div>

          {/* Card */}
          <div
            className="card shadow-sm"
            style={{ borderRadius: "12px" }}
          >
            <div className="card-body">
              <form onSubmit={submitHandler}>
                {/* Name */}
                <div className="mb-3">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-control"
                    value={name}
                    required
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Password */}
                <div className="mb-4">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    required
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {/* Button */}
                <button
                  className="btn w-100"
                  disabled={loading}
                  style={{
                    background:
                      "linear-gradient(180deg, #0f3a4a, #134952)",
                    color: "white",
                    padding: "10px",
                    borderRadius: "8px",
                  }}
                >
                  {loading ? "Creating..." : "Create Teacher"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
