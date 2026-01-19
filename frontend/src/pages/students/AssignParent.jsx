import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useParams, useNavigate } from "react-router-dom";

export default function AssignParent() {
  const { id } = useParams(); // studentId
  const navigate = useNavigate();

  const [parents, setParents] = useState([]);
  const [parentId, setParentId] = useState("");

  useEffect(() => {
    api.get("/users?role=parent").then((res) => setParents(res.data));
  }, []);

  const submitHandler = async (e) => {
    e.preventDefault();

    await api.post(`/students/${id}/assign-parent`, {
      parentId,
    });

    alert("Parent assigned successfully");
    navigate("/students");
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h4>Assign Parent</h4>

        <form onSubmit={submitHandler}>
          <div className="mb-3">
            <label>Select Parent</label>
            <select
              className="form-select"
              required
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">Select Parent</option>
              {parents.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.email})
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary">Assign</button>
        </form>
      </div>
    </div>
  );
}
