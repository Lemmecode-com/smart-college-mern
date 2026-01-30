import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AssignSubjects() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherId, setTeacherId] = useState("");
  const [subjectIds, setSubjectIds] = useState([]);

  useEffect(() => {
    api.get("/teachers").then(res => setTeachers(res.data));
    api.get("/subjects").then(res => setSubjects(res.data));
  }, []);

  const toggle = (id) => {
    setSubjectIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const submit = async () => {
    await api.post(`/teachers/${teacherId}/assign-subjects`, { subjectIds });
    alert("Subjects assigned");
  };

  return (
    <>
      <h3>Assign Subjects to Teacher</h3>

      <select className="form-control mb-3"
        onChange={e => setTeacherId(e.target.value)}>
        <option>Select Teacher</option>
        {teachers.map(t => (
          <option key={t._id} value={t._id}>{t.name}</option>
        ))}
      </select>

      {subjects.map(s => (
        <div key={s._id}>
          <input type="checkbox" onChange={() => toggle(s._id)} /> {s.name}
        </div>
      ))}

      <button className="btn btn-success mt-3" onClick={submit}>
        Assign
      </button>
    </>
  );
}
