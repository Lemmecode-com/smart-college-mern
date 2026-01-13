import { useState } from "react";
import api from "../../api/axios";

export default function AddDepartment() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  /* ========== AUTO GENERATE CODE ========== */
  const generateCode = (value) => {
    const generated = value.substring(0, 3).toUpperCase();
    setName(value);
    setCode(generated);
  };

  /* ========== SUBMIT HANDLER ========== */
  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/departments", { name, code });
      alert("Department created successfully");
      setName("");
      setCode("");
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container-fluid py-5"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #ffffff, #ffffff)"
      }}
    >
      <div className="container">
        <div
          className="card shadow-lg border-0"
          style={{ borderRadius: "16px", maxWidth: "520px", margin: "auto" }}
        >
          <div className="card-body p-4 p-md-5">
            <h4 className="mb-4 fw-bold text-dark">
              Add Department
            </h4>

            <form onSubmit={submitHandler}>
              {/* Department Name */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Department Name *
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  required
                  onChange={(e) => generateCode(e.target.value)}
                />
              </div>

              {/* Department Code */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Department Code
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={code}
                  disabled
                />
              </div>

              <button
                className="btn btn-dark w-100 py-2"
                disabled={loading}
                style={{ borderRadius: "10px" }}
              >
                {loading ? "Saving..." : "Create Department"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
