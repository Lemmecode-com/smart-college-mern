import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AddTeacher() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  useEffect(() => {
    api.get("/departments").then(res => setDepartments(res.data));
    api.get("/subjects").then(res => setSubjects(res.data));
  }, []);

  const handleSubjectChange = (id) => {
    setSelectedSubjects(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    await api.post("/teachers", {
      name,
      email,
      password,
      departmentId,
      subjectIds: selectedSubjects
    });

    alert("Teacher added successfully");
    setName("");
    setEmail("");
    setPassword("");
    setDepartmentId("");
    setSelectedSubjects([]);
  };

  return (
    <div className="container-fluid px-3 px-md-4">
      <div
        className="card shadow-lg"
        style={{
          background: "linear-gradient(180deg, #0f3a4a, #134952)",
          color: "#fff",
          borderRadius: "16px"
        }}
      >
        <div className="card-body">
          <h4 className="mb-4 text-center text-md-start">
            ➕ Add Teacher
          </h4>

          <form onSubmit={submitHandler}>
            <div className="row g-3">

              <div className="col-md-6">
                <label className="form-label">Teacher Name</label>
                <input
                  className="form-control"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Department</label>
                <select
                  className="form-select"
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">Assign Subjects</label>
                <div className="row">
                  {subjects.map(s => (
                    <div key={s._id} className="col-6 col-md-4">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedSubjects.includes(s._id)}
                          onChange={() => handleSubjectChange(s._id)}
                        />
                        <label className="form-check-label">
                          {s.name}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-12 text-center text-md-start mt-3">
                <button
                  className="btn btn-light px-4"
                  style={{ borderRadius: "10px" }}
                >
                  Create Teacher
                </button>
              </div>

            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
