import { useEffect, useState } from "react";
import api from "../../../api/axios";

export default function CreateTimetable() {
  const [department, setDepartment] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    course_id: "",
    semester: "",
    academicYear: "",
  });

  const [previewName, setPreviewName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* LOAD PROFILE */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/teachers/my-profile");
        setDepartment(res.data.department_id); // OBJECT
      } catch {
        setError("Failed to load department");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  /* LOAD COURSES */
  useEffect(() => {
    if (!department?._id) return;

    const loadCourses = async () => {
      try {
        const res = await api.get(
          `/courses/department/${department._id}`
        );
        setCourses(res.data);
      } catch {
        setError("Failed to load courses");
      }
    };

    loadCourses();
  }, [department]);

  /* AUTO NAME */
  useEffect(() => {
    if (!form.course_id || !form.semester || !form.academicYear) {
      setPreviewName("");
      return;
    }

    const course = courses.find(c => c._id === form.course_id);
    if (!course) return;

    setPreviewName(
      `${course.name} - Sem ${form.semester} (${form.academicYear})`
    );
  }, [form, courses]);

  /* SUBMIT */
  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post("/timetable", {
        department_id: department._id,
        course_id: form.course_id,
        semester: Number(form.semester),
        academicYear: form.academicYear,
      });

      setSuccess("Timetable created successfully");
      setForm({ course_id: "", semester: "", academicYear: "" });
      setPreviewName("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create timetable");
    }
  };

  if (loading) return <p className="text-center mt-5">Loading...</p>;

  return (
    <div className="container py-4">
      <div className="card shadow border-0 mx-auto" style={{ maxWidth: 480 }}>
        <div className="card-body">
          <h4 className="fw-bold mb-3">Create Timetable</h4>

          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="mb-3">
            <label className="form-label">Department</label>
            <input
              className="form-control"
              value={department?.name || ""}
              disabled
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Course</label>
            <select
              className="form-select"
              value={form.course_id}
              onChange={e =>
                setForm({ ...form, course_id: e.target.value })
              }
              required
            >
              <option value="">Select course</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Semester</label>
            <select
              className="form-select"
              value={form.semester}
              onChange={e =>
                setForm({ ...form, semester: e.target.value })
              }
              required
            >
              <option value="">Select semester</option>
              {[1,2,3,4,5,6,7,8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Academic Year</label>
            <select
              className="form-select"
              value={form.academicYear}
              onChange={e =>
                setForm({ ...form, academicYear: e.target.value })
              }
              required
            >
              <option value="">Select academic year</option>
              <option value="2024-2025">2024–2025</option>
              <option value="2025-2026">2025–2026</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="form-label">Timetable Name (auto)</label>
            <input className="form-control" value={previewName} readOnly />
          </div>

          <button className="btn btn-primary w-100" onClick={submitHandler}>
            Create Timetable
          </button>
        </div>
      </div>
    </div>
  );
}
