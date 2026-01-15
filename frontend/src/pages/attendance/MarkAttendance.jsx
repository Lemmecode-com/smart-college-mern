import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function MarkAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= LOAD TEACHER SUBJECTS ================= */
  useEffect(() => {
    api
      .get("/subjects")
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        setSubjects(list);
      })
      .catch(() => setSubjects([]));
  }, []);

  /* ================= LOAD STUDENTS ================= */
  const loadStudents = async (id) => {
    if (!id) return;

    setSubjectId(id);
    setLoading(true);

    try {
      const res = await api.get("/students", {
        params: { subjectId: id }
      });

      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      setStudents(list);

      const map = {};
      list.forEach((s) => (map[s._id] = "Present"));
      setRecords(map);
    } catch (err) {
      console.error(err);
      setStudents([]);
      setRecords({});
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (studentId, status) => {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!subjectId || !date || students.length === 0) {
      alert("Select subject, date and students");
      return;
    }

    const payload = {
      subjectId,
      date,
      records: Object.entries(records).map(([studentId, status]) => ({
        studentId,
        status
      }))
    };

    try {
      await api.post("/attendance", payload);
      alert("Attendance marked successfully");
      setStudents([]);
      setRecords({});
      setSubjectId("");
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
            value={subjectId}
            onChange={(e) => loadStudents(e.target.value)}
            required
          >
            <option value="">Select Subject</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="form-control mb-3"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          {loading && <p>Loading students...</p>}

          {!loading && students.length > 0 && (
            <>
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td>
                        <select
                          className="form-select"
                          value={records[s._id]}
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
