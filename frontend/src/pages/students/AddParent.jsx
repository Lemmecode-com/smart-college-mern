import { useState } from "react";
import api from "../../api/axios";

export default function AddParent() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    occupation: "",
    phone: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      await api.post("/parents", form);
      alert("Parent added successfully");
      setForm({
        name: "",
        email: "",
        password: "",
        occupation: "",
        phone: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add parent");
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="mb-3">Add Parent</h5>

        <form onSubmit={submitHandler}>
          {["name", "email", "password", "occupation", "phone"].map((field) => (
            <div className="mb-3" key={field}>
              <label className="text-capitalize">{field}</label>
              <input
                type={field === "password" ? "password" : "text"}
                name={field}
                className="form-control"
                required
                value={form[field]}
                onChange={handleChange}
              />
            </div>
          ))}

          <button className="btn btn-primary">Add Parent</button>
        </form>
      </div>
    </div>
  );
}
