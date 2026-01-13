

import { useState } from "react";
import api from "../../api/axios";

export default function AddDepartment() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const generateCode = (value) => {
    const generated = value.substring(0, 3).toUpperCase();
    setCode(generated);
    setName(value);
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/departments", { name, code });
      alert("Department created");
      setName("");
      setCode("");
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    }
    setLoading(false);
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="mb-3">Add Department</h5>

        <form onSubmit={submitHandler}>
          <div className="mb-3">
            <label>Department Name</label>
            <input
              className="form-control"
              value={name}
              required
              onChange={(e) => generateCode(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label>Department Code</label>
            <input className="form-control" value={code} disabled />
          </div>

          <button className="btn" style={{backgroundColor:"background:#134952)"}} disabled={loading}>
            {loading ? "Saving..." : "Create"}
          </button>
        </form>
      </div>
    </div>
  );
}
