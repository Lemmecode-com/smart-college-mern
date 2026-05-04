import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function MarkAttendance() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Load teacher courses
  useEffect(() => {
    api
      .get("/courses/my")
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        setCourses(list);
      })
      .catch(() => setCourses([]));
  }, []);

  // Load students by course
  const loadStudents = async (id) => {
    if (!id) return;

    setCourseId(id);
    setLoading(true);

    try {
      const res = await api.get(`/students?courseId=${id}`);

      // ✅ FIX: normalize API response
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      setStudents(list);
      setRecords(
        list.map((s) => ({
          studentId: s._id,
          status: "Present",
        }))
      );
    } catch (err) {
      console.error("Failed to load students", err);
      setStudents([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (studentId, status) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, status } : r
      )
    );
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!courseId || !date || records.length === 0) {
      alert("Please select course, date and students");
      return;
    }

    try {
      await api.post("/attendance", {
        courseId,
        date,
        records,
      });

      alert("Attendance marked successfully");

      // Reset form
      setStudents([]);
      setRecords([]);
      setCourseId("");
      setDate("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark attendance");
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="mb-3">Mark Attendance</h5>

        <form onSubmit={submitHandler}>
          <select
            className="form-select mb-3"
            value={courseId}
            onChange={(e) => loadStudents(e.target.value)}
            required
          >
            <option value="">Select Course</option>

            {courses.length === 0 && (
              <option disabled>No courses assigned</option>
            )}

            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="form-control mb-3"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {loading && <p>Loading students...</p>}

          {!loading && students.length > 0 && (
            <>
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Roll No</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td>{s.rollNo}</td>
                      <td>
                        <select
                          className="form-select"
                          value={
                            records.find((r) => r.studentId === s._id)
                              ?.status || "Present"
                          }
                          onChange={(e) =>
                            updateStatus(s._id, e.target.value)
                          }
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button className="btn btn-primary mt-3">
                Submit Attendance
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
