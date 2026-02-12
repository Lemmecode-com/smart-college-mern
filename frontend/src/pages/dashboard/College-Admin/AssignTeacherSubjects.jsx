import { useEffect, useState } from "react";
import api from "../../../api/axios";

export default function AssignTeacherSubjects() {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [teacherId, setTeacherId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");

  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* ================= FETCH INITIAL DATA ================= */
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [teacherRes, deptRes] = await Promise.all([
          api.get("/users/teachers"),
          api.get("/departments")
        ]);

        setTeachers(teacherRes.data.data || []);
        setDepartments(deptRes.data.data || []);
      } catch {
        setMessage("Failed to load teachers or departments");
      }
    };

    fetchInitial();
  }, []);

  /* ================= FETCH COURSES ================= */
  useEffect(() => {
    if (!departmentId) return;

    api
      .get(`/courses?departmentId=${departmentId}`)
      .then((res) => setCourses(res.data.data || []))
      .catch(() => setCourses([]));
  }, [departmentId]);

  /* ================= FETCH SUBJECTS ================= */
  useEffect(() => {
    if (!courseId) return;

    api
      .get(`/subjects?courseId=${courseId}`)
      .then((res) => setSubjects(res.data.data || []))
      .catch(() => setSubjects([]));
  }, [courseId]);

  /* ================= CHECKBOX HANDLER ================= */
  const toggleSubject = (id) => {
    setSelectedSubjects((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : [...prev, id]
    );
  };

  /* ================= ASSIGN HANDLER ================= */
  const assignHandler = async (e) => {
    e.preventDefault();

    if (!teacherId || selectedSubjects.length === 0) {
      setMessage("Please select a teacher and subjects to assign");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await api.post(
        `/teachers/${teacherId}/assign-subjects`,
        { subjectIds: selectedSubjects }
      );

      setMessage("Subjects successfully assigned 🎉");
      setSelectedSubjects([]);
    } catch {
      setMessage("Assignment failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "auto" }}>
      <h3 style={{ marginBottom: "20px" }}>Assign Subjects to Teacher</h3>

      {message && (
        <div style={{ marginBottom: "15px", color: "red" }}>{message}</div>
      )}

      <form onSubmit={assignHandler}>
        {/* Teacher */}
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          required
          style={input}
        >
          <option value="">Select Teacher</option>
          {teachers.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} ({t.email})
            </option>
          ))}
        </select>

        {/* Department */}
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setCourseId("");
            setSubjects([]);
          }}
          required
          style={input}
        >
          <option value="">Select Department</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Course */}
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          required
          disabled={!departmentId}
          style={input}
        >
          <option value="">Select Course</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Subjects */}
        <div style={{ marginBottom: "20px" }}>
          {subjects.length === 0 && <p>No subjects available</p>}

          {subjects.map((s) => (
            <label key={s._id} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={selectedSubjects.includes(s._id)}
                onChange={() => toggleSubject(s._id)}
              />{" "}
              {s.name} ({s.code})
            </label>
          ))}
        </div>

        <button disabled={loading} style={btn}>
          {loading ? "Assigning..." : "Assign Subjects"}
        </button>
      </form>
    </div>
  );
}

/* ================= STYLES ================= */
const input = {
  width: "100%",
  padding: "10px",
  marginBottom: "12px",
  borderRadius: "8px"
};

const btn = {
  width: "100%",
  padding: "12px",
  background: "#0f3a4a",
  color: "#fff",
  borderRadius: "8px",
  border: "none"
};
