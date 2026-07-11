import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

export default function AssignTeacherSubjects() {
  const navigate = useNavigate();
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

  const AUTH_ERROR_CODES = new Set([
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
    "TOKEN_BLACKLISTED",
    "TOKEN_INVALIDATED",
    "USER_NOT_FOUND",
    "ACCOUNT_DEACTIVATED",
    "UNAUTHORIZED",
  ]);

  /* ================= FETCH INITIAL DATA ================= */
  const fetchInitial = async () => {
    try {
      const [teacherRes, deptRes] = await Promise.all([
        api.get("/users/teachers"),
        api.get("/departments")
      ]);

      setTeachers(teacherRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))
        ? "Authentication error occurred."
        : backendMessage || "Failed to load teachers or departments";

      logger.error("Error fetching initial data:", statusCode, errorCode);
      setMessage({
        message: errorMessage,
        statusCode,
        errorCode,
      });
    }
  };

  useEffect(() => {
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
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error assigning subjects:", statusCode, errorCode);
        setMessage({
          message: "Authentication error occurred.",
          statusCode,
          errorCode,
        });
      } else {
        setMessage("Assignment failed");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "auto" }}>
      {message && typeof message === 'object' && (
        <ApiError
          title="Assign Subjects Error"
          message={message.message}
          statusCode={message.statusCode}
          errorCode={message.errorCode}
          onRetry={fetchInitial}
        />
      )}
      {message && typeof message === 'string' && (
        <div style={{ marginBottom: "15px", color: "red" }}>{message}</div>
      )}

      <h3 style={{ marginBottom: "20px" }}>Assign Subjects to Teacher</h3>

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
